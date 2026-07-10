const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const { list: listBlobs, del: delBlob } = require('@vercel/blob');
const { handleUpload } = require('@vercel/blob/client');

dotenv.config();

const app = express();

// 미들웨어
app.use(cors());
app.use(express.json());
app.use(express.static('./'));

// ─────────────────────────────────────────
// 텔레그램 알림 설정
// - .env의 TELEGRAM_TOKEN, TELEGRAM_CHAT_ID 사용
// - 값이 없으면 알림만 비활성화하고 사이트 기능은 그대로 동작
// ─────────────────────────────────────────
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

let telegramEnabled = true;
if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
  telegramEnabled = false;
  console.error('❌ 텔레그램 알림을 사용할 수 없습니다. .env 파일을 확인해주세요.');
  if (!TELEGRAM_TOKEN) console.error('   - TELEGRAM_TOKEN 값이 설정되지 않았습니다.');
  if (!TELEGRAM_CHAT_ID) console.error('   - TELEGRAM_CHAT_ID 값이 설정되지 않았습니다.');
}

async function sendTelegramMessage(text) {
  if (!telegramEnabled) return;
  try {
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text
    });
  } catch (err) {
    console.error('❌ 텔레그램 메시지 전송 실패:', err.response?.data || err.message);
  }
}

// MongoDB 연결
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tech-academy', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('✅ MongoDB 연결 성공');
}).catch(err => {
  console.error('❌ MongoDB 연결 실패:', err);
});

// 게시판 스키마
const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ['후기', '질문', '정보공유'],
    default: '정보공유',
  },
  author: {
    type: String,
    required: true,
  },
  views: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// 게시판 모델
const Post = mongoose.model('Post', postSchema);

// API 라우트

// 모든 게시물 조회
app.get('/api/posts', async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = {};

    if (category && category !== '전체') {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
      ];
    }

    const posts = await Post.find(query).sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 특정 게시물 조회 및 조회수 증가
app.get('/api/posts/:id', async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );
    res.json(post);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 게시물 작성
app.post('/api/posts', async (req, res) => {
  try {
    const { title, content, category, author } = req.body;

    if (!title || !content || !author) {
      return res.status(400).json({ error: '필수 항목을 입력해주세요' });
    }

    const post = new Post({
      title,
      content,
      category: category || '정보공유',
      author,
    });

    await post.save();
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 게시물 수정
app.put('/api/posts/:id', async (req, res) => {
  try {
    const { title, content, category } = req.body;
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      {
        title,
        content,
        category,
        updatedAt: new Date(),
      },
      { new: true }
    );
    res.json(post);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 게시물 삭제
app.delete('/api/posts/:id', async (req, res) => {
  try {
    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: '게시물이 삭제되었습니다' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 문의하기 폼 제출 (index.html "빠른 문의 남기기")
// - 별도 저장 없이 텔레그램으로 즉시 전달만 한다
app.post('/api/contact', async (req, res) => {
  try {
    const { name, phone, message } = req.body;

    if (!name || !phone || !message) {
      return res.status(400).json({ error: '이름, 연락처, 문의내용을 모두 입력해주세요' });
    }

    await sendTelegramMessage(
      `📩 새 문의가 도착했어요\n이름: ${name}\n연락처: ${phone}\n내용: ${message}`
    );

    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// qna-board.html에 새 질문이 등록되면 텔레그램으로 알림
// - qna-board.html은 localStorage에 저장하므로, 여기서는 알림 전달만 한다
app.post('/api/qna-notify', async (req, res) => {
  try {
    const { title, author, category, content } = req.body;

    if (!title || !author) {
      return res.status(400).json({ error: '제목과 작성자는 필수입니다' });
    }

    await sendTelegramMessage(
      `❓ 새 질문이 등록됐어요 [${category || ''}]\n제목: ${title}\n작성자: ${author}\n내용: ${content || ''}`
    );

    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 카카오톡 오픈채팅 문의 버튼 클릭 알림
// - 실제 오픈채팅 대화 내용은 카카오 플랫폼 안에서 이뤄지므로 확인 불가하지만,
//   버튼을 눌러 오픈채팅으로 이동했다는 사실만 텔레그램으로 알려준다
app.post('/api/kakao-click-notify', async (req, res) => {
  try {
    await sendTelegramMessage('💬 카카오톡 오픈채팅 문의 버튼을 클릭한 방문자가 있어요');
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────
// 수업자료 (materials.html)
// - 비밀번호(0983)는 서버에서 확인 — 클라이언트 코드에 노출되지 않음
// - 큰 동영상 파일도 올릴 수 있도록 브라우저 → Vercel Blob 직접 업로드 방식 사용
//   (서버리스 함수의 요청 본문 4.5MB 제한을 피하기 위함)
// ─────────────────────────────────────────
const MATERIALS_PASSWORD = '0983';
const MATERIALS_PREFIX = 'materials/';

// GitHub 이중 백업 설정
// - 이미지/PPT/워드/PDF처럼 작은 파일만 백업 (동영상 등 큰 파일은 GitHub API/함수 실행시간 한계로 제외)
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = 'skystar3133';
const GITHUB_REPO = 'skystar';
const GITHUB_BRANCH = 'main';
const MATERIALS_BACKUP_MAX_BYTES = 20 * 1024 * 1024; // 20MB

async function backupMaterialToGitHub(pathname, fileUrl) {
  if (!GITHUB_TOKEN) {
    console.error('❌ GITHUB_TOKEN이 설정되지 않아 GitHub 백업을 건너뜁니다.');
    return;
  }

  try {
    const head = await axios.head(fileUrl);
    const size = parseInt(head.headers['content-length'] || '0', 10);
    if (size > MATERIALS_BACKUP_MAX_BYTES) {
      console.log(`⏭️ 파일이 커서(${size}바이트) GitHub 백업을 건너뜁니다: ${pathname}`);
      return;
    }

    const fileResponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    const content = Buffer.from(fileResponse.data).toString('base64');
    const backupPath = `materials-backup/${pathname.replace(/^materials\//, '')}`;

    await axios.put(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodeURI(backupPath)}`,
      {
        message: `수업자료 백업: ${backupPath}`,
        content,
        branch: GITHUB_BRANCH,
      },
      {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github+json',
        },
      }
    );

    console.log('✅ GitHub 백업 완료:', backupPath);
  } catch (error) {
    console.error('❌ GitHub 백업 실패:', error.response?.data || error.message);
  }
}

// 자료 목록 조회
app.post('/api/materials/list', async (req, res) => {
  try {
    const { password } = req.body;
    if (password !== MATERIALS_PASSWORD) {
      return res.status(401).json({ error: '비밀번호가 올바르지 않습니다' });
    }

    const { blobs } = await listBlobs({ prefix: MATERIALS_PREFIX });
    const materials = blobs
      .map(b => ({
        url: b.url,
        pathname: b.pathname,
        name: decodeURIComponent(b.pathname.slice(MATERIALS_PREFIX.length).replace(/^\d+-/, '')),
        size: b.size,
        uploadedAt: b.uploadedAt,
      }))
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    res.json({ materials });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 업로드용 토큰 발급 (Vercel Blob의 클라이언트 직접 업로드 프로토콜)
app.post('/api/materials/upload', async (req, res) => {
  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        let payload = {};
        try { payload = JSON.parse(clientPayload || '{}'); } catch (e) { /* ignore */ }

        if (payload.password !== MATERIALS_PASSWORD) {
          throw new Error('비밀번호가 올바르지 않습니다');
        }

        return {
          addRandomSuffix: true,
          maximumSizeInBytes: 300 * 1024 * 1024, // 300MB
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log('✅ 수업자료 업로드 완료:', blob.pathname);
        await backupMaterialToGitHub(blob.pathname, blob.url);
      },
    });

    res.json(jsonResponse);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 자료 삭제
app.post('/api/materials/delete', async (req, res) => {
  try {
    const { password, url } = req.body;
    if (password !== MATERIALS_PASSWORD) {
      return res.status(401).json({ error: '비밀번호가 올바르지 않습니다' });
    }
    if (!url) {
      return res.status(400).json({ error: 'url이 필요합니다' });
    }

    await delBlob(url);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 서버 시작 (로컬에서 `node server.js`로 직접 실행할 때만 포트를 연다 — Vercel 서버리스 환경에서는 app만 export)
const PORT = process.env.PORT || 5000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
  });
}

module.exports = app;