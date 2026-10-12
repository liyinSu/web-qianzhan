// 华夏文脉 · 文化旅游网站
// 交互脚本

document.addEventListener('DOMContentLoaded', () => {

  // --- 移动端菜单切换 ---
  const toggle = document.querySelector('.mobile-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (toggle && navLinks) {
    toggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });

    // 点击导航链接后关闭菜单
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
      });
    });
  }

  // --- 导航栏滚动效果 ---
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    });
  }

  // --- 滚动淡入动画 (Intersection Observer) ---
  const fadeElements = document.querySelectorAll('.fade-in');
  if (fadeElements.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -50px 0px'
    });

    fadeElements.forEach(el => observer.observe(el));
  }

  // --- 高亮当前页面导航 ---
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const navAnchors = document.querySelectorAll('.nav-links a');
  navAnchors.forEach(a => {
    const href = a.getAttribute('href');
    if (href === currentPath) {
      a.classList.add('active');
    }
  });

  // --- 卡片点击跳转 ---
  document.querySelectorAll('.dest-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // 防止点击内部链接时重复跳转
      if (e.target.closest('.dest-card-link')) return;
      const link = card.querySelector('.dest-card-link');
      if (link) {
        window.location.href = link.getAttribute('href');
      }
    });
  });

});
