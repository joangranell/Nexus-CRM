import os
import sys
import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.users import User, UserRole
from app.services.auth import get_password_hash, create_access_token

TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def init_test_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    superadmin = User(
        name="Super Admin",
        email="superadmin@nexuscrm.com",
        password_hash=get_password_hash("superadmin123", rounds=4),
        role=UserRole.SUPER_ADMIN,
        is_active=True,
    )
    admin = User(
        name="Elena Directora",
        email="admin@nexuscrm.com",
        password_hash=get_password_hash("admin123", rounds=4),
        role=UserRole.ADMIN_MARKETING,
        is_active=True,
    )
    carlos = User(
        name="Carlos Comercial",
        email="carlos@nexuscrm.com",
        password_hash=get_password_hash("comercial123", rounds=4),
        role=UserRole.COMERCIAL,
        is_active=True,
    )
    db.add_all([superadmin, admin, carlos])
    db.commit()

    yield db

    db.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def superadmin_headers():
    token = create_access_token(data={"sub": "1", "email": "superadmin@nexuscrm.com", "role": "SUPER_ADMIN"})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_headers():
    token = create_access_token(data={"sub": "2", "email": "admin@nexuscrm.com", "role": "ADMIN_MARKETING"})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def comercial_headers():
    token = create_access_token(data={"sub": "3", "email": "carlos@nexuscrm.com", "role": "COMERCIAL"})
    return {"Authorization": f"Bearer {token}"}
