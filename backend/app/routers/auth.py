from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.users import User, UserRole
from app.schemas.auth import Token, UserLogin, UserResponse, UserCreate
from app.services.auth import (
    verify_password,
    create_access_token,
    get_password_hash,
    get_current_user,
    require_role,
)

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    """Logs in user with email and password, returning JWT access token."""
    user = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas (email o contraseña inválidos)",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta de usuario está desactivada",
        )

    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role.value}
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user,
    }


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Returns currently authenticated user profile."""
    return current_user


@router.get("/users", response_model=List[UserResponse])
def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns active users for assignment dropdowns and filters."""
    return db.query(User).filter(User.is_active == True).all()


@router.post("/register", response_model=UserResponse)
def register_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN])),
):
    """Admin-only user creation endpoint."""
    existing = db.query(User).filter(User.email == payload.email.lower().strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un usuario con este correo electrónico",
        )
    user = User(
        name=payload.name,
        email=payload.email.lower().strip(),
        password_hash=get_password_hash(payload.password),
        role=payload.role,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
