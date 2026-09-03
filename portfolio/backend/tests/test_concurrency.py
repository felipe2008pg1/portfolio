import threading

import pyotp

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.admin_user import AdminUser
from app.services import mfa_service, refresh_service


def _make_admin(username):
    db = SessionLocal()
    try:
        admin = AdminUser(username=username, hashed_password=hash_password("StrongPass!234"))
        db.add(admin)
        db.commit()
        db.refresh(admin)
        return admin.id
    finally:
        db.close()


def _run_concurrently(fn, n=10):
    results = []
    lock = threading.Lock()

    def _wrapped():
        result = fn()
        with lock:
            results.append(result)

    threads = [threading.Thread(target=_wrapped) for _ in range(n)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    return results


def test_refresh_token_cannot_be_rotated_twice_concurrently():
    admin_id = _make_admin("race_refresh")
    db = SessionLocal()
    try:
        raw_token = refresh_service.issue_refresh_token(db, admin_id)
    finally:
        db.close()

    def _attempt():
        db = SessionLocal()
        try:
            return refresh_service.validate_and_rotate_refresh_token(db, raw_token)
        finally:
            db.close()

    results = _run_concurrently(_attempt)
    successes = [r for r in results if r is not None]
    assert len(successes) == 1


def test_totp_code_cannot_be_consumed_twice_concurrently():
    admin_id = _make_admin("race_totp")
    db = SessionLocal()
    try:
        admin = db.get(AdminUser, admin_id)
        data = mfa_service.init_mfa_setup(db, admin)
        db.refresh(admin)
        totp = pyotp.TOTP(data["secret"])
        mfa_service.confirm_mfa_setup(db, admin, totp.now())
        db.refresh(admin)
        code = totp.generate_otp(admin.mfa_last_totp_counter + 1)
    finally:
        db.close()

    def _attempt():
        db = SessionLocal()
        try:
            admin = db.get(AdminUser, admin_id)
            return mfa_service.verify_mfa_code(db, admin, code)
        finally:
            db.close()

    results = _run_concurrently(_attempt)
    assert sum(1 for r in results if r) == 1


def test_backup_code_cannot_be_consumed_twice_concurrently():
    admin_id = _make_admin("race_backup")
    db = SessionLocal()
    try:
        admin = db.get(AdminUser, admin_id)
        data = mfa_service.init_mfa_setup(db, admin)
        db.refresh(admin)
        codes = mfa_service.confirm_mfa_setup(db, admin, pyotp.TOTP(data["secret"]).now())
    finally:
        db.close()

    code = codes[0]

    def _attempt():
        db = SessionLocal()
        try:
            admin = db.get(AdminUser, admin_id)
            return mfa_service.verify_mfa_code(db, admin, code)
        finally:
            db.close()

    results = _run_concurrently(_attempt)
    assert sum(1 for r in results if r) == 1