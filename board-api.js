// 게시판 API 클라이언트

const API_URL = 'http://localhost:5000/api';

// 게시물 목록 조회
async function fetchPosts(category = '전체', search = '') {
  try {
    let url = `${API_URL}/posts`;
    const params = new URLSearchParams();

    if (category !== '전체') {
      params.append('category', category);
    }
    if (search) {
      params.append('search', search);
    }

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error('게시물 조회 실패');
    return await response.json();
  } catch (error) {
    console.error('Error fetching posts:', error);
    return [];
  }
}

// 특정 게시물 조회
async function fetchPost(id) {
  try {
    const response = await fetch(`${API_URL}/posts/${id}`);
    if (!response.ok) throw new Error('게시물 조회 실패');
    return await response.json();
  } catch (error) {
    console.error('Error fetching post:', error);
    return null;
  }
}

// 게시물 작성
async function createPost(title, content, category, author) {
  try {
    const response = await fetch(`${API_URL}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        content,
        category,
        author,
      }),
    });

    if (!response.ok) throw new Error('게시물 작성 실패');
    return await response.json();
  } catch (error) {
    console.error('Error creating post:', error);
    alert('게시물 작성에 실패했습니다.');
    return null;
  }
}

// 게시물 수정
async function updatePost(id, title, content, category) {
  try {
    const response = await fetch(`${API_URL}/posts/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        content,
        category,
      }),
    });

    if (!response.ok) throw new Error('게시물 수정 실패');
    return await response.json();
  } catch (error) {
    console.error('Error updating post:', error);
    alert('게시물 수정에 실패했습니다.');
    return null;
  }
}

// 게시물 삭제
async function deletePost(id) {
  try {
    if (!confirm('정말 삭제하시겠습니까?')) return false;

    const response = await fetch(`${API_URL}/posts/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) throw new Error('게시물 삭제 실패');
    alert('게시물이 삭제되었습니다.');
    return true;
  } catch (error) {
    console.error('Error deleting post:', error);
    alert('게시물 삭제에 실패했습니다.');
    return false;
  }
}

// 게시물 목록 렌더링
async function renderPosts(category = '전체', search = '') {
  const posts = await fetchPosts(category, search);
  const tbody = document.getElementById('boardTableBody');

  if (!tbody) return;

  if (posts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">게시물이 없습니다.</td></tr>';
    return;
  }

  tbody.innerHTML = posts.map((post, idx) => `
    <tr>
      <td>${posts.length - idx}</td>
      <td>
        <span class="category-badge" style="background-color: ${getCategoryColor(post.category)}">${post.category}</span>
        <a href="#" class="post-title" onclick="viewPost('${post._id}')">${post.title}</a>
      </td>
      <td>${post.author}</td>
      <td>${formatDate(post.createdAt)}</td>
      <td style="text-align: center; color: var(--text-secondary);">${post.views}</td>
    </tr>
  `).join('');
}

// 게시물 상세 보기
async function viewPost(id) {
  const post = await fetchPost(id);
  if (!post) return;

  alert(`[${post.category}] ${post.title}\n\n${post.content}\n\n작성자: ${post.author}\n조회: ${post.views}`);
}

// 날짜 포맷
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR');
}

// 카테고리 색상
function getCategoryColor(category) {
  const colors = {
    '후기': '#7132f5',
    '질문': '#5741d8',
    '정보공유': '#9497a9',
  };
  return colors[category] || '#686b82';
}

// 게시물 작성 폼
function showCreatePostForm() {
  const title = prompt('제목을 입력하세요:');
  if (!title) return;

  const content = prompt('내용을 입력하세요:');
  if (!content) return;

  const author = prompt('작성자명을 입력하세요:');
  if (!author) return;

  const category = prompt('카테고리를 선택하세요 (후기/질문/정보공유):', '정보공유');

  if (!['후기', '질문', '정보공유'].includes(category)) {
    alert('올바른 카테고리를 선택해주세요.');
    return;
  }

  createPost(title, content, category, author).then(() => {
    renderPosts();
  });
}