/* =========================================================================
   游侠客 · 长白山秋色6日徒步游
   动效层：极简高级 —— 仅滚动渐入 / 卡片悬浮（CSS 负责）/ 导航状态 / 图片兜底 / 报名弹窗
   无轮播、无花哨动画。
   ========================================================================= */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------------
     1. 滚动渐入（IntersectionObserver，一次性触发）
     --------------------------------------------------------------------- */
  function initReveal() {
    var items = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    if (!items.length) return;

    // 不支持 IntersectionObserver 时直接全部显示，保证内容可读
    if (!('IntersectionObserver' in window) || reduceMotion) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var delay = parseInt(el.getAttribute('data-delay') || '0', 10);
        window.setTimeout(function () { el.classList.add('is-in'); }, delay);
        io.unobserve(el);                       // 只渐入一次，避免反复闪动
      });
    }, {
      root: null,
      rootMargin: '0px 0px -12% 0px',
      threshold: 0.12
    });

    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------------------------------------------------------------------
     2. 顶部导航：滚过首屏后转为米白磨砂实底
     --------------------------------------------------------------------- */
  function initNav() {
    var nav = document.getElementById('nav');
    if (!nav) return;

    var ticking = false;
    function update() {
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      var threshold = Math.max(120, window.innerHeight * 0.72);
      nav.classList.toggle('is-solid', y > threshold);
      ticking = false;
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
  }

  /* ---------------------------------------------------------------------
     3. 导航当前模块高亮（轻量，不改变滚动行为）
     --------------------------------------------------------------------- */
  function initScrollSpy() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.nav__link'));
    if (!links.length || !('IntersectionObserver' in window)) return;

    var map = {};
    var sections = [];
    links.forEach(function (link) {
      var id = (link.getAttribute('href') || '').replace('#', '');
      var sec = id && document.getElementById(id);
      if (!sec) return;
      map[id] = link;
      sections.push(sec);
    });
    if (!sections.length) return;

    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var link = map[entry.target.id];
        if (!link) return;
        if (entry.isIntersecting) {
          links.forEach(function (l) { l.classList.remove('is-active'); });
          link.classList.add('is-active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

    sections.forEach(function (sec) { spy.observe(sec); });
  }

  /* ---------------------------------------------------------------------
     4. 图片兜底：实景图加载失败时，替换为高级秋色渐变 + 山形剪影
        （保证任何网络环境下页面都不出现破图，氛围不被破坏）
     --------------------------------------------------------------------- */
  function initImageFallback() {
    var imgs = Array.prototype.slice.call(document.querySelectorAll('img'));

    imgs.forEach(function (img) {
      function fail() {
        var host = img.closest('.day__figure') ||
                   img.closest('.review__banner') ||
                   img.parentElement;
        if (host) host.classList.add('img-fallback');
        img.setAttribute('aria-hidden', 'true');
        img.removeAttribute('src');
      }
      if (img.complete) {
        if (img.naturalWidth === 0 && img.getAttribute('src')) fail();
      } else {
        img.addEventListener('error', fail, { once: true });
      }
    });

    // 首屏横幅实景图兜底：失败则隐藏图片，露出 .hero 自带秋色渐变与山形剪影
    var heroImg = document.querySelector('.hero__img');
    var heroSec = document.querySelector('.hero');
    if (heroImg && heroSec) {
      function heroFail() { heroSec.classList.add('img-fallback'); }
      if (heroImg.complete) {
        if (heroImg.naturalWidth === 0) heroFail();
      } else {
        heroImg.addEventListener('error', heroFail, { once: true });
      }
    }
  }

  /* ---------------------------------------------------------------------
     5. 横幅轻微视差（位移极小，保持高级克制）
     --------------------------------------------------------------------- */
  function initHeroParallax() {
    var media = document.querySelector('.hero__img');
    var hero = document.querySelector('.hero');
    if (!media || !hero || reduceMotion) return;
    if (window.matchMedia('(max-width: 768px)').matches) return;   // 移动端不做视差

    var ticking = false;
    function update() {
      var y = window.pageYOffset || 0;
      if (y < window.innerHeight * 1.2) {
        media.style.transform = 'translate3d(0, ' + (y * 0.10).toFixed(2) + 'px, 0) scale(1.06)';
      }
      ticking = false;
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------------------------------------------------------------------
     6. 锚点平滑滚动（受系统「减弱动效」偏好约束）
     --------------------------------------------------------------------- */
  function initAnchors() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href').slice(1);
      if (!id) return;
      var target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'start'
      });
      if (history.replaceState) history.replaceState(null, '', '#' + id);
    });
  }

  /* ---------------------------------------------------------------------
     7. 报名弹窗：立即报名 → 弹出表单 → 保存 → 主页面弹出提交成功提示
     --------------------------------------------------------------------- */
  function initBookingModal() {
    var modal = document.getElementById('signup-modal');
    var form = document.getElementById('signup-form');
    var toast = document.getElementById('toast');
    var errMsg = document.getElementById('form-error');
    if (!modal || !form || !toast) return;

    var toastTimer = null;

    function openModal() {
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      if (errMsg) errMsg.hidden = true;
      var first = form.querySelector('input[name="name"]');
      window.setTimeout(function () { if (first) first.focus(); }, 320);
    }

    function closeModal() {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
      if (errMsg) errMsg.hidden = true;
    }

    function showToast() {
      toast.classList.add('is-show');
      if (toastTimer) window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(function () {
        toast.classList.remove('is-show');
      }, 4000);
    }

    // 打开弹窗
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('#btn-signup');
      if (btn) { e.preventDefault(); openModal(); return; }
      if (e.target.closest && e.target.closest('[data-close]')) closeModal();
    });

    // ESC 关闭
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
    });

    // 提交校验：姓名必填，手机号 11 位（1 开头）
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = (form.elements.name.value || '').trim();
      var phone = (form.elements.phone.value || '').trim();
      var valid = name.length > 0 && /^1\d{10}$/.test(phone);

      if (!valid) {
        if (errMsg) errMsg.hidden = false;
        return;
      }

      if (errMsg) errMsg.hidden = true;
      closeModal();
      form.reset();
      showToast();   // 主页面弹出「恭喜您提交成功」
    });
  }

  /* ---------------------------------------------------------------------
     启动
     --------------------------------------------------------------------- */
  function boot() {
    initReveal();
    initNav();
    initScrollSpy();
    initImageFallback();
    initHeroParallax();
    initAnchors();
    initBookingModal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
