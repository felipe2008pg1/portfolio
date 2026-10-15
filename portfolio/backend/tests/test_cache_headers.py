from app.core.security import create_access_token


def test_public_lists_are_cacheable(client):
    for path in ("/api/projects", "/api/skills", "/api/experiences"):
        response = client.get(path)
        assert response.status_code == 200
        assert "s-maxage" in response.headers["cache-control"]


def test_admin_lists_are_not_publicly_cacheable(client):
    client.cookies.set("access_token", create_access_token(subject="someone"))
    for path in ("/api/projects/admin", "/api/experiences/admin"):
        response = client.get(path)
        assert "public" not in response.headers.get("cache-control", "")


def test_admin_skills_list_requires_auth_and_is_uncached(client):
    assert client.get("/api/skills/admin").status_code == 401
    client.cookies.set("access_token", create_access_token(subject="someone"))
    response = client.get("/api/skills/admin")
    assert response.status_code == 200
    assert "public" not in response.headers.get("cache-control", "")