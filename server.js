const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');

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

// 서버 시작
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});