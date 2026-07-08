# 게시판 시스템 설정 가이드

## 🚀 기술 스택

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Node.js + Express
- **Database**: MongoDB
- **API**: RESTful API

## 📋 설치 및 실행

### 1. 필수 설치 항목

```bash
# Node.js 설치 (https://nodejs.org)
# MongoDB 설치 (https://www.mongodb.com/try/download/community)
```

### 2. 의존성 설치

```bash
npm install
```

### 3. MongoDB 실행

**로컬 MongoDB 사용:**
```bash
# Windows
mongod.exe

# Mac/Linux
mongod
```

**또는 MongoDB Atlas 클라우드 사용:**
1. https://www.mongodb.com/cloud/atlas 접속
2. 계정 생성 후 클러스터 생성
3. 연결 문자열 복사
4. `.env` 파일의 `MONGODB_URI` 수정

### 4. 개발 서버 실행

```bash
# 개발 모드 (nodemon 사용, 파일 변경 시 자동 재시작)
npm run dev

# 또는 일반 실행
npm start
```

서버가 실행되면: `http://localhost:5000`

## 📡 API 엔드포인트

### 게시물 목록 조회
```
GET /api/posts
GET /api/posts?category=후기
GET /api/posts?search=검색어
```

### 특정 게시물 조회 (조회수 증가)
```
GET /api/posts/:id
```

### 게시물 작성
```
POST /api/posts
Content-Type: application/json

{
  "title": "게시물 제목",
  "content": "게시물 내용",
  "category": "후기",
  "author": "작성자명"
}
```

### 게시물 수정
```
PUT /api/posts/:id
Content-Type: application/json

{
  "title": "수정된 제목",
  "content": "수정된 내용",
  "category": "질문"
}
```

### 게시물 삭제
```
DELETE /api/posts/:id
```

## 🗄️ 데이터베이스 스키마

```javascript
{
  _id: ObjectId,
  title: String,
  content: String,
  category: String (후기|질문|정보공유),
  author: String,
  views: Number,
  createdAt: Date,
  updatedAt: Date
}
```

## 🛠️ 디버깅

### MongoDB 연결 확인
```bash
# MongoDB Compass 사용
# https://www.mongodb.com/products/compass
# mongodb://localhost:27017 로 연결하여 데이터 확인
```

### API 테스트
```bash
# Postman (https://www.postman.com) 또는 Thunder Client 사용
# 위의 API 엔드포인트 사용
```

## 📦 프로덕션 배포

### Heroku 배포 예시
```bash
# heroku 계정 생성 후
heroku create your-app-name
heroku addons:create mongolab
git push heroku main
```

### MongoDB Atlas 사용
MongoDB Atlas의 프리 티어로 무료 호스팅 가능

## 🔐 보안

- `.env` 파일에 민감한 정보 저장
- `.gitignore`에 `.env` 추가 (이미 설정됨)
- 프로덕션에서는 환경 변수로 설정

## 📚 참고 자료

- [Express 공식 문서](https://expressjs.com)
- [Mongoose 가이드](https://mongoosejs.com)
- [MongoDB 공식 문서](https://docs.mongodb.com)
- [RESTful API 설계](https://restfulapi.net)