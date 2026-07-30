---
name: board-builder
description: GitHub API와 Vercel Serverless 기반의 정적 게시판 웹사이트 빌더 스킬
---

# Board Builder Skill

본 스킬은 Vercel Serverless Function과 GitHub REST API를 연동하여 정적 HTML 환경에서 동적 게시판 CRUD 기능 및 관리자 페이지를 제공하는 시스템 가이드입니다.

## 주요 기능
1. **GitHub API 데이터 동기화**: 게시글 작성/수정/삭제 시 `data/posts.json`을 GitHub 저장소에 자동 커밋 및 동기화
2. **Vercel Zero-Config 배포**: cleanUrls 지원 및 Serverless API 라우팅 (`api/config.js`)
3. **경량 마크다운 렌더러**: 외부 라이브러리 없이 마크다운 파싱 및 안전한 HTML 변환 (`db.js`)
4. **관리자 대시보드**: `admin.html`을 통한 비밀번호 로그인 및 게시글 CRUD 통합 관리
