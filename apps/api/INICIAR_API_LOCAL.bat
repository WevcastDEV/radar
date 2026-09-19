@echo off
set DATABASE_URL=postgresql://radar:radar_secret_2024@localhost:5432/radar_db?schema=public
set JWT_SECRET=radar-jwt-secret-change-in-production-2024
call npm run start:dev
