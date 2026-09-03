import pyotp

from app.core.security import create_access_token, decrypt_totp_secret, hash_password
from app.models.admin_user import AdminUser
from app.services import mfa_service


def _make_admin(db_session, username, password="StrongPass!234"):
    admin = AdminUser(username=username, hashed_password=hash_password(password))
    db_session.add(admin)
    db_session.commit()
    db_session.refresh(admin)
    return admin


def test_mfa_secret_is_encrypted_at_rest(db_session):
    admin = _make_admin(db_session, "sec_admin_1")
    mfa_service.init_mfa_setup(db_session, admin)
    db_session.refresh(admin)

    assert admin.mfa_secret is not None
    # A raw pyotp base32 secret is short alnum uppercase; the Fernet
    # ciphertext is neither — decrypting is the only way it makes sense.
    assert not admin.mfa_secret.isupper()
    decrypted = decrypt_totp_secret(admin.mfa_secret)
    assert len(decrypted) >= 16


def test_totp_code_cannot_be_replayed(db_session):
    admin = _make_admin(db_session, "sec_admin_2")
    data = mfa_service.init_mfa_setup(db_session, admin)
    db_session.refresh(admin)
    totp = pyotp.TOTP(data["secret"])
    mfa_service.confirm_mfa_setup(db_session, admin, totp.now())
    db_session.refresh(admin)

    # One step after whatever confirm_mfa_setup just consumed — decoupled
    # from wall-clock timing/step boundaries, unlike calling .now() twice.
    code = totp.generate_otp(admin.mfa_last_totp_counter + 1)
    assert mfa_service.verify_mfa_code(db_session, admin, code) is True
    assert mfa_service.verify_mfa_code(db_session, admin, code) is False


def test_backup_code_is_single_use(db_session):
    admin = _make_admin(db_session, "sec_admin_3")
    data = mfa_service.init_mfa_setup(db_session, admin)
    db_session.refresh(admin)
    codes = mfa_service.confirm_mfa_setup(db_session, admin, pyotp.TOTP(data["secret"]).now())
    db_session.refresh(admin)

    code = codes[0]
    assert mfa_service.verify_mfa_code(db_session, admin, code) is True
    assert mfa_service.verify_mfa_code(db_session, admin, code) is False


def test_mutating_admin_route_requires_csrf_token(client, db_session):
    admin = _make_admin(db_session, "csrf_admin")
    token = create_access_token(subject=admin.username)
    client.cookies.set("access_token", token)

    response = client.post("/api/auth/mfa/setup/init")

    assert response.status_code == 403
    assert "csrf" in response.json()["detail"].lower()


def test_visitor_chat_token_is_httponly_cookie_not_json(client, monkeypatch):
    async def _fake_verify(token, ip):
        return True

    monkeypatch.setattr("app.api.routes.chat.verify_turnstile_token", _fake_verify)

    response = client.post(
        "/api/chat/conversations",
        json={"turnstile_token": "x", "website": ""},
    )

    assert response.status_code == 201
    assert "visitor_token" not in response.json()
    set_cookie = response.headers.get("set-cookie", "")
    assert "visitor_token=" in set_cookie
    assert "httponly" in set_cookie.lower()