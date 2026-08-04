let _config = null;

async function loadConfig() {
  if (_config) return _config;
  let api = {}, file = {};
  try { const r = await fetch('/api/config'); if (r.ok) api = await r.json(); } catch(e) {}
  try { const r = await fetch('config/git_config.json'); if (r.ok) file = await r.json(); } catch(e) {}
  const apiTok = String(api.github_token || '').trim();
  const fileTok = String(file.github_token || '').trim();
  _config = {
    github_token: (apiTok && apiTok !== 'YOUR_GITHUB_TOKEN') ? apiTok : fileTok,
    github_owner: file.github_owner || '',
    github_repo: file.github_repo || '',
    data_file_path: file.data_file_path || 'data/posts.json',
    admin_password: file.admin_password || 'Wlzla2424**'
  };
  return _config;
}

function isAdmin() {
  return sessionStorage.getItem('isAdmin') === 'true';
}

function requireAdmin() {
  if (!isAdmin()) {
    window.location.href = 'admin.html';
  }
}

function handleAgentLogin(event) {
  if (event) event.preventDefault();
  window.location.href = 'admin.html';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function parseInline(str) {
  if (!str) return '';
  return str
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function(match, alt, src) {
      return `<img src="${src}" alt="${escapeHtml(alt)}" referrerpolicy="no-referrer" class="max-w-full h-auto rounded-xl my-4 shadow-sm border border-outline-variant block" loading="lazy" />`;
    })
    .replace(/&lt;img\s+([^&]+)src=&quot;([^&quot;]+)&quot;([^&]*)(&gt;|\/&gt;|&lt;\/img&gt;)/gi, function(match, p1, src, p3) {
      return `<img src="${src}" referrerpolicy="no-referrer" class="max-w-full h-auto rounded-xl my-4 shadow-sm border border-outline-variant block" loading="lazy" />`;
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+|mailto:[^\s\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary font-medium underline hover:opacity-80">$1</a>');
}

function renderMarkdown(src) {
  if (!src) return '';

  let codeBlocks = [];
  let raw = src.replace(/```([\s\S]*?)```/g, function(match, p1) {
    const placeholder = `___CODEBLOCK_${codeBlocks.length}___`;
    codeBlocks.push(escapeHtml(p1.trim()));
    return placeholder;
  });

  let escaped = escapeHtml(raw);

  let inlineCodes = [];
  escaped = escaped.replace(/`([^`]+)`/g, function(match, p1) {
    const placeholder = `___INLINECODE_${inlineCodes.length}___`;
    inlineCodes.push(`<code class="bg-surface-container px-1.5 py-0.5 rounded text-sm font-mono text-primary">${p1}</code>`);
    return placeholder;
  });

  let lines = escaped.split(/\r?\n/);
  let htmlResult = [];
  let inList = false;
  let listType = null;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    if (/^#{1,6}\s+/.test(line)) {
      if (inList) { htmlResult.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      let level = line.match(/^(#{1,6})/)[1].length;
      let text = line.replace(/^#{1,6}\s+/, '');
      text = parseInline(text);
      let sizeClass = level === 1 ? 'text-2xl font-bold my-4' : level === 2 ? 'text-xl font-bold my-3' : 'text-lg font-semibold my-2';
      htmlResult.push(`<h${level} class="${sizeClass} text-on-surface">${text}</h${level}>`);
      continue;
    }

    if (/^\s*&gt;\s+/.test(line)) {
      if (inList) { htmlResult.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      let text = line.replace(/^\s*&gt;\s+/, '');
      text = parseInline(text);
      htmlResult.push(`<blockquote class="border-l-4 border-primary pl-4 py-2 my-3 italic text-on-surface-variant bg-surface-container-low rounded-r">${text}</blockquote>`);
      continue;
    }

    if (/^\s*---\s*$/.test(line)) {
      if (inList) { htmlResult.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      htmlResult.push('<hr class="my-4 border-outline-variant"/>');
      continue;
    }

    let ulMatch = line.match(/^\s*[-\*]\s+(.+)/);
    let olMatch = line.match(/^\s*\d+\.\s+(.+)/);

    if (ulMatch) {
      if (!inList || listType !== 'ul') {
        if (inList) htmlResult.push(listType === 'ul' ? '</ul>' : '</ol>');
        htmlResult.push('<ul class="list-disc list-inside my-2 space-y-1 text-on-surface-variant">');
        inList = true;
        listType = 'ul';
      }
      htmlResult.push(`<li>${parseInline(ulMatch[1])}</li>`);
      continue;
    }

    if (olMatch) {
      if (!inList || listType !== 'ol') {
        if (inList) htmlResult.push(listType === 'ul' ? '</ul>' : '</ol>');
        htmlResult.push('<ol class="list-decimal list-inside my-2 space-y-1 text-on-surface-variant">');
        inList = true;
        listType = 'ol';
      }
      htmlResult.push(`<li>${parseInline(olMatch[1])}</li>`);
      continue;
    }

    if (inList) {
      htmlResult.push(listType === 'ul' ? '</ul>' : '</ol>');
      inList = false;
    }

    if (line.trim().length > 0) {
      htmlResult.push(`<p class="my-2 leading-relaxed text-on-surface-variant">${parseInline(line)}</p>`);
    }
  }

  if (inList) {
    htmlResult.push(listType === 'ul' ? '</ul>' : '</ol>');
  }

  let finalHtml = htmlResult.join('\n');

  inlineCodes.forEach((codeHtml, idx) => {
    finalHtml = finalHtml.replace(`___INLINECODE_${idx}___`, codeHtml);
  });

  codeBlocks.forEach((codeText, idx) => {
    finalHtml = finalHtml.replace(`___CODEBLOCK_${idx}___`, `<pre class="bg-tertiary-container text-on-tertiary p-4 rounded-lg my-3 overflow-x-auto font-mono text-sm"><code>${codeText}</code></pre>`);
  });

  return finalHtml;
}

function markdownToText(src) {
  if (!src) return '';
  return src
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '')
    .replace(/<img[^>]*>/gi, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*&gt;\s+/gm, '')
    .replace(/^\s*[-\*]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/\r?\n/g, ' ')
    .trim();
}

async function getPosts() {
  let localPosts = [];
  const localData = localStorage.getItem('board_posts');
  if (localData) {
    try {
      localPosts = JSON.parse(localData) || [];
    } catch(e) {}
  }

  let serverPosts = [];
  try {
    const r = await fetch('data/posts.json?v=' + Date.now());
    if (r.ok) {
      serverPosts = await r.json();
    }
  } catch(e) {}

  // 서버 데이터와 로컬 스토리지 데이터를 ID 기준으로 스마트 병합 (유실 방지)
  const map = new Map();
  serverPosts.forEach(p => {
    if (p && p.id) map.set(String(p.id), p);
  });
  localPosts.forEach(p => {
    if (p && p.id) map.set(String(p.id), p);
  });

  const merged = Array.from(map.values());
  merged.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));

  localStorage.setItem('board_posts', JSON.stringify(merged));
  return merged;
}

async function savePost(post) {
  let posts = await getPosts();
  if (post.id) {
    const idx = posts.findIndex(p => String(p.id) === String(post.id));
    if (idx !== -1) {
      posts[idx] = { ...posts[idx], ...post, date: post.date || new Date().toISOString().split('T')[0].replace(/-/g, '.') };
    } else {
      posts.unshift(post);
    }
  } else {
    post.id = Date.now();
    post.date = post.date || new Date().toISOString().split('T')[0].replace(/-/g, '.');
    posts.unshift(post);
  }
  localStorage.setItem('board_posts', JSON.stringify(posts));
  try {
    await syncToGitHub(posts);
  } catch(e) {
    console.warn('GitHub sync warning:', e);
  }
  return post;
}

async function deletePost(id) {
  let posts = await getPosts();
  posts = posts.filter(p => String(p.id) !== String(id));
  localStorage.setItem('board_posts', JSON.stringify(posts));
  try {
    await syncToGitHub(posts);
  } catch(e) {
    console.warn('GitHub sync warning:', e);
  }
  return true;
}

async function syncToGitHub(posts) {
  const cfg = await loadConfig();
  const token = String(cfg.github_token || '').trim().replace(/\s+/g, '');
  if (!token || token === 'YOUR_GITHUB_TOKEN' || !cfg.github_owner || !cfg.github_repo) {
    console.warn('GitHub API sync skipped: Missing credentials or token in config.');
    return false;
  }

  const url = `https://api.github.com/repos/${cfg.github_owner}/${cfg.github_repo}/contents/${cfg.data_file_path}`;
  const jsonStr = JSON.stringify(posts, null, 2);
  const contentBase64 = btoa(unescape(encodeURIComponent(jsonStr)));

  let sha = null;
  try {
    const getRes = await fetch(url, {
      headers: {
        'Authorization': 'token ' + token,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    if (getRes.ok) {
      const fileInfo = await getRes.json();
      sha = fileInfo.sha;
    }
  } catch(e) {}

  const bodyData = {
    message: 'docs: update board posts via web admin',
    content: contentBase64,
    branch: 'main'
  };
  if (sha) bodyData.sha = sha;

  const putRes = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': 'token ' + token,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github.v3+json'
    },
    body: JSON.stringify(bodyData)
  });

  if (!putRes.ok) {
    const errJson = await putRes.json().catch(() => ({}));
    console.error('GitHub API update failed:', putRes.status, errJson);
    throw new Error(errJson.message || `GitHub API error: ${putRes.status}`);
  }
  return true;
}

window.loadConfig = loadConfig;
window.isAdmin = isAdmin;
window.requireAdmin = requireAdmin;
window.handleAgentLogin = handleAgentLogin;
window.escapeHtml = escapeHtml;
window.renderMarkdown = renderMarkdown;
window.markdownToText = markdownToText;
window.getPosts = getPosts;
window.savePost = savePost;
window.deletePost = deletePost;
window.syncToGitHub = syncToGitHub;
