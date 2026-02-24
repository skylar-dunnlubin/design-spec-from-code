/**
 * Design Specification from Code — Interactive Script
 * Handles: sticky nav, mobile menu, scroll animations, copy-to-clipboard,
 *          prompt builder, template tabs, and example tabs.
 * Vanilla JS, no dependencies.
 */

document.addEventListener('DOMContentLoaded', () => {

  // ============================================================
  // 1. STICKY NAV — Scroll-Spy + Click-to-Scroll
  // ============================================================
  // Uses getBoundingClientRect() for all position calculations.
  // This avoids stale offsetTop values caused by overflow:hidden,
  // position:relative, lazy-loaded images, or web font reflow.

  const nav = document.querySelector('nav.nav');
  const navLinks = document.querySelectorAll('a.nav-link[data-section]');

  // Always read nav height fresh — it can change after fonts load
  // or when nav--scrolled applies different padding
  const getNavHeight = () => nav?.offsetHeight ?? 72;

  const sectionIds = Array.from(navLinks).map(link => link.dataset.section);
  const sections = sectionIds
    .map(id => document.getElementById(id))
    .filter(Boolean);

  const navLinksContainer = document.querySelector('.nav-links');

  const setActiveNavLink = (sectionId) => {
    navLinks.forEach(link => {
      if (link.dataset.section === sectionId) {
        link.classList.add('active');
        // Scroll the nav bar horizontally to show the active link.
        // Do NOT use link.scrollIntoView() — it triggers a competing
        // smooth scroll on the document that fights the section scroll.
        if (navLinksContainer) {
          const linkLeft = link.offsetLeft;
          const linkWidth = link.offsetWidth;
          const barWidth = navLinksContainer.offsetWidth;
          const barScroll = navLinksContainer.scrollLeft;
          if (linkLeft < barScroll || linkLeft + linkWidth > barScroll + barWidth) {
            navLinksContainer.scrollTo({
              left: linkLeft - barWidth / 2 + linkWidth / 2,
              behavior: 'smooth'
            });
          }
        }
      } else {
        link.classList.remove('active');
      }
    });
  };

  // Scroll-spy: use getBoundingClientRect for real-time viewport positions
  const getActiveSection = () => {
    const nh = getNavHeight();
    // Detection line: just below the nav + a small buffer
    const detectionLine = nh + 60;
    let activeId = sectionIds[0] ?? '';

    for (const section of sections) {
      // rect.top is relative to viewport; if top is above detection line,
      // the section has scrolled into or past the reading area
      if (section.getBoundingClientRect().top <= detectionLine) {
        activeId = section.id;
      }
    }
    return activeId;
  };

  // Flag: disable spy during programmatic scroll so click stays put
  let spyEnabled = true;

  const onScroll = () => {
    // Nav background
    if (nav) {
      nav.classList.toggle('nav--scrolled', window.scrollY > 50);
    }
    // Scroll-spy
    if (spyEnabled) {
      setActiveNavLink(getActiveSection());
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Nav link click → scroll to section
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.dataset.section;
      const target = document.getElementById(targetId);
      if (!target) return;

      // Lock active state and disable spy during animation
      spyEnabled = false;
      setActiveNavLink(targetId);

      // Scroll to the .section-header inside the section (not the section
      // wrapper) so the header lands right below the nav. Falls back to the
      // section itself if no header exists.
      const header = target.querySelector('.section-header');
      (header || target).scrollIntoView({ behavior: 'smooth', block: 'start' });

      // Re-enable spy after scroll animation settles (long page needs more time)
      setTimeout(() => { spyEnabled = true; }, 1500);

      closeMobileNav();
    });
  });

  // Logo click → top
  const navLogo = document.querySelector('.nav-logo');
  navLogo?.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    closeMobileNav();
  });


  // ============================================================
  // 2. MOBILE NAV TOGGLE
  // ============================================================

  const menuBtn = document.querySelector('.nav-menu-btn');
  // navLinksContainer is declared above in section 1

  const closeMobileNav = () => {
    menuBtn?.classList.remove('open');
    navLinksContainer?.classList.remove('open');
  };

  const toggleMobileNav = () => {
    menuBtn?.classList.toggle('open');
    navLinksContainer?.classList.toggle('open');
  };

  menuBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMobileNav();
  });

  // Close when a nav link is clicked (mobile)
  navLinks.forEach(link => {
    link.addEventListener('click', closeMobileNav);
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!navLinksContainer?.classList.contains('open')) return;
    if (!e.target.closest('.nav-inner')) {
      closeMobileNav();
    }
  });


  // ============================================================
  // 3. FADE-IN ON SCROLL (Intersection Observer)
  // ============================================================

  const fadeSelectors = [
    '.section-header',
    '.callout',
    '.objection-card',
    '.method-step',
    '.spec-section-card',
    '.role-card',
    '.risk-item',
    '.dev-step',
    '.example-step',
    '.stat-card',
    '.reg-card',
    '.exec-value-card',
    '.governance-card',
    '.safeguard-item',
    '.changelog-step'
  ];

  const fadeElements = document.querySelectorAll(fadeSelectors.join(', '));

  const fadeObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          // Once visible, stop observing (animation plays once)
          fadeObserver.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.15,
      rootMargin: '0px 0px -50px 0px'
    }
  );

  fadeElements.forEach(el => fadeObserver.observe(el));


  // ============================================================
  // 4. COPY TO CLIPBOARD
  // ============================================================

  const copyButtons = document.querySelectorAll('.copy-btn');

  copyButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const targetId = btn.dataset.target;
      const target = document.getElementById(targetId);
      if (!target) return;

      const text = target.textContent?.trim() ?? '';

      try {
        // Modern clipboard API
        await navigator.clipboard.writeText(text);
        showCopied(btn);
      } catch {
        // Fallback for older browsers or non-HTTPS contexts
        fallbackCopy(text, btn);
      }
    });
  });

  const showCopied = (btn) => {
    const originalText = btn.textContent;
    btn.textContent = 'Copied!';
    btn.classList.add('copied');

    setTimeout(() => {
      btn.textContent = originalText;
      btn.classList.remove('copied');
    }, 2000);
  };

  const fallbackCopy = (text, btn) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();

    try {
      document.execCommand('copy');
      showCopied(btn);
    } catch {
      btn.textContent = 'Failed';
      setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
    }

    document.body.removeChild(textarea);
  };


  // ============================================================
  // 5. PROMPT BUILDER — Interactive Form
  // ============================================================

  // -- Mode Toggle (Extract / Update) --
  const toggleBtns = document.querySelectorAll('.toggle-btn[data-mode]');
  const extractFields = document.querySelector('.extract-fields');
  const updateFields = document.querySelector('.update-fields');
  let currentMode = 'extract';

  toggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      currentMode = btn.dataset.mode;

      // Update active states
      toggleBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Show/hide mode-specific fields
      extractFields?.classList.add('hidden');
      updateFields?.classList.add('hidden');

      if (currentMode === 'extract') {
        extractFields?.classList.remove('hidden');
      } else if (currentMode === 'update') {
        updateFields?.classList.remove('hidden');
      }
    });
  });

  // -- Generate Prompts --
  const generateBtn = document.getElementById('generate-prompt');
  const promptOutput = document.getElementById('prompt-output');

  generateBtn?.addEventListener('click', () => {
    // Read form values
    const projectName = document.getElementById('project-name')?.value.trim() || 'My Project';
    const techStackSelect = document.getElementById('tech-stack');
    const techStack = techStackSelect?.options[techStackSelect.selectedIndex]?.text ?? 'React + TypeScript';
    const featureScope = document.getElementById('feature-scope')?.value.trim() || 'Core application features';
    const keyScreens = document.getElementById('key-screens')?.value.trim() || 'Main screens and components';
    const designSystem = document.getElementById('design-system')?.value.trim() || '';
    const existingSpec = document.getElementById('existing-spec')?.value.trim() || '';
    const whatsNew = document.getElementById('whats-new')?.value.trim() || '';

    // Update-mode fields
    const updateSpecPath = document.getElementById('update-spec-path')?.value.trim() || '';
    const updateVerifiedSha = document.getElementById('update-verified-sha')?.value.trim() || '';
    const updateCurrentRef = document.getElementById('update-current-ref')?.value.trim() || 'HEAD';
    const updateDescription = document.getElementById('update-description')?.value.trim() || '';

    const designSystemLine = designSystem
      ? `\nDesign system reference: ${designSystem}`
      : '';

    let prompt1, prompt2, prompt3;

    // DOM elements for output
    const promptBlock3 = document.getElementById('prompt-block-3');
    const promptDesc = document.getElementById('prompt-output-desc');
    const promptLabel1 = document.getElementById('prompt-label-1');
    const promptLabel2 = document.getElementById('prompt-label-2');
    const promptLabel3 = document.getElementById('prompt-label-3');

    if (currentMode === 'extract') {
      prompt1 = buildExtractPrompt1(projectName, techStack, keyScreens, designSystemLine, existingSpec);
      prompt2 = buildExtractPrompt2(projectName, keyScreens, whatsNew);
      prompt3 = buildExtractPrompt3(projectName, existingSpec);
      // Show all 3 blocks
      promptBlock3?.classList.remove('hidden');
      if (promptDesc) promptDesc.textContent = 'Run these three prompts in sequence in Claude Code. Each builds on the previous step\'s output.';
      if (promptLabel1) promptLabel1.textContent = 'Step 1: Codebase Analysis';
      if (promptLabel2) promptLabel2.textContent = 'Step 2: Design Decision Extraction';
      if (promptLabel3) promptLabel3.textContent = 'Step 3: Specification Generation';
    } else {
      // Update mode — 2 prompts only
      prompt1 = buildUpdatePrompt1(projectName, techStack, updateSpecPath, updateVerifiedSha, updateCurrentRef, updateDescription);
      prompt2 = buildUpdatePrompt2(projectName, updateSpecPath, updateVerifiedSha, updateCurrentRef);
      prompt3 = null;
      // Hide block 3
      promptBlock3?.classList.add('hidden');
      if (promptDesc) promptDesc.textContent = 'Run these two prompts in sequence in Claude Code. The first analyzes changes; the second updates the spec.';
      if (promptLabel1) promptLabel1.textContent = 'Step 1: Diff Analysis';
      if (promptLabel2) promptLabel2.textContent = 'Step 2: Spec Update + Changelog';
    }

    // Populate prompt blocks
    const prompt1Code = document.querySelector('#prompt-1 code');
    const prompt2Code = document.querySelector('#prompt-2 code');
    const prompt3Code = document.querySelector('#prompt-3 code');

    if (prompt1Code) prompt1Code.textContent = prompt1;
    if (prompt2Code) prompt2Code.textContent = prompt2;
    if (prompt3Code) prompt3Code.textContent = prompt3 || '';

    // Show output and scroll to it
    promptOutput?.classList.remove('hidden');

    setTimeout(() => {
      promptOutput.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  });

  // -- Extract Mode Prompt Templates --

  const buildExtractPrompt1 = (projectName, techStack, keyScreens, designSystemLine, existingSpec) => {
    const existingLine = existingSpec
      ? `\nCompare against the existing spec at ${existingSpec}. Identify NEW and MODIFIED elements.`
      : '';
    return `Read the entire ${projectName} codebase (${techStack}). Map the following:
1. Every screen/page: name, route, purpose
2. Component tree: parent-child relationships for ${keyScreens}
3. Shared components, hooks, and utilities
4. Data models and API endpoints consumed
5. Navigation structure and user flows
6. Design system usage: tokens, theme, shared styles
7. Identify all component states and their trigger conditions
8. Map entry/exit points for every user flow with preconditions
9. Extract data validation rules, valid ranges, and error triggers
${designSystemLine}${existingLine}
Output a structured codebase analysis document.`.trim();
  };

  const buildExtractPrompt2 = (projectName, keyScreens, whatsNew) => {
    const focusLine = whatsNew
      ? `\nFocus on changes only. For modified components, document BEFORE and AFTER behavior.\nChanges: ${whatsNew}`
      : '';
    return `Using the codebase analysis of ${projectName}, extract every design decision:
1. Layout patterns: grid systems, responsive behavior, page structure
2. Component states: all states each component handles (default, hover, active, disabled, error, loading)
3. Interaction patterns: forms, modals, navigation, real-time updates, gestures
4. Visual design: colors, typography, spacing, iconography choices
5. Data display: formatting rules, units, precision, empty/error states
6. Error handling: validation logic, error messages, recovery flows
7. Accessibility: ARIA usage, keyboard navigation, contrast ratios, screen reader support

For each decision, document:
- The decision made
- The rationale (why this approach vs alternatives)
- The code file and line range where it's implemented

For each component state, document:
- The precondition that triggers it
- The visual change
- The acceptance criterion (how to verify it's correct)

For each interaction, document:
- Precondition \u2192 action \u2192 expected outcome \u2192 postcondition

For each data display rule, document:
- Valid input range, formatting rule, edge case handling, error state
${focusLine}
Focus on: ${keyScreens}`;
  };

  const buildExtractPrompt3 = (projectName, existingSpec) => {
    const refLine = existingSpec
      ? `\nReference parent spec: ${existingSpec}\nClearly distinguish NEW vs MODIFIED elements throughout.`
      : '';
    return `Generate a complete Design Specification document for ${projectName} following this 12-section structure:

1. Document Header (version, date, scope, regulatory refs: FDA 21 CFR 820.30, IEC 62304, IEC 62366)
2. Design Intent (purpose, user needs addressed, design input references)
3. Screen Inventory (every screen: name, purpose, navigation path)
4. Component Specification (each component: visual description, all states, behavior, acceptance criteria, data contract, accessibility assertions)
5. Layout & Visual Design (grid, spacing, typography, color, responsive breakpoints)
6. Interaction Design (user flows with precondition/postcondition per step, entry/exit conditions, error paths with recovery, edge case table)
7. Data Display (field format rules, valid ranges, edge case handling, error states)
8. Design Rationale (why each choice was made, alternatives considered, traces to user needs)
9. Design System Alignment (tokens used, patterns reused, deviations justified)
10. Accessibility (WCAG compliance with automated test assertions: contrast, keyboard, screen reader, touch targets)
11. Traceability Matrix (user needs \u2192 design inputs \u2192 spec sections \u2192 code files)
12. Verification Summary (component verification checklist, flow verification checklist, data verification rules, traceability verification)

Requirements:
- Reference specific code files for every component and screen
- Include acceptance criteria for every component state
- Include precondition/postcondition for every user flow
- Include a Verification Summary (\u00a712) that consolidates all pass/fail criteria
- The spec must be usable as a verification oracle \u2014 a human or AI should be able to read it and determine whether the production code is correct
- Use formal regulatory language suitable for a Design History File
- The traceability matrix must link to actual code file paths
${refLine}
Output as a single Markdown document ready for review.`;
  };


  // -- Update Mode Prompt Templates --

  const buildUpdatePrompt1 = (projectName, techStack, specPath, verifiedSha, currentRef, description) =>
`Analyze the code changes in ${projectName} (${techStack}) between the previously verified commit and current state.

Previously verified merge: ${verifiedSha || '[merge SHA]'}
Current reference: ${currentRef || 'HEAD'}
Spec being updated: ${specPath || '[path to design spec]'}
${description ? `\nChange description: ${description}` : ''}

Instructions:
1. Run \`git diff ${verifiedSha || '[verified-SHA]'}..${currentRef || 'HEAD'}\` to identify all changed files
2. Filter to UI-relevant changes: components, screens, styles, layouts, interactions, data display
3. For each changed file, document:
   - File path and change type (modified/added/deleted)
   - Lines added/removed count
   - Functional description of what changed
   - Which section(s) of the existing spec are affected
4. Identify which acceptance criteria from the existing spec are affected by the changes
5. Flag any new states, flows, or data rules that need new acceptance criteria
6. Identify any NEW screens, components, or user flows not in the existing spec
7. Identify any REMOVED elements that should be removed from the spec

Output a structured diff analysis document organized by spec section impact.`.trim();

  const buildUpdatePrompt2 = (projectName, specPath, verifiedSha, currentRef) =>
`Using the diff analysis of ${projectName}, update the design specification.

Existing spec: ${specPath || '[path to design spec]'}
Previous verified merge: ${verifiedSha || '[merge SHA]'}
Current reference: ${currentRef || 'HEAD'}

For each spec section affected by the code changes:
1. Show the PREVIOUS spec content for that section
2. Show the UPDATED spec content reflecting the code changes
3. Explain the rationale for each change (trace to design inputs where possible)

Then generate:

A. **Verification Impact:**
   For each changed acceptance criterion, show previous vs. updated.
   List new acceptance criteria needed for new states/flows/data rules.

B. **Updated Verification Summary (\u00a712):**
   Update the component, flow, and data verification checklists.

C. **New Changelog Entry:**
   | Version | Date | Author | Git Ref | Summary |
   Add an entry covering the commit range ${verifiedSha || '[SHA]'}..${currentRef || 'HEAD'}

D. **Updated Verification Header:**
   Set status to STALE with a note: "Code changed since last verification. Design re-review recommended."

E. **Re-Verification Recommendation:**
   List each affected section with:
   - What changed
   - Priority for design re-review (High/Medium/Low)
   - Whether the change is cosmetic, behavioral, or structural
   - Rate regression risk per affected flow

F. **Impact Assessment:**
   - Affected user flows
   - Regression risk per change
   - Traceability impact (any user needs affected?)

Output as a Markdown document that can be appended to or merged into the existing spec.`;



  // ============================================================
  // 6. TEMPLATE TABS
  // ============================================================

  const templateTabs = document.querySelectorAll('.template-tab[data-template]');
  const templateContents = document.querySelectorAll('.template-content');

  templateTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const templateId = tab.dataset.template;

      // Update active tab
      templateTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Show/hide content
      templateContents.forEach(content => {
        if (content.id === `template-${templateId}`) {
          content.classList.add('active');
        } else {
          content.classList.remove('active');
        }
      });
    });
  });


  // ============================================================
  // 7. EXAMPLE TABS
  // ============================================================

  const exampleTabs = document.querySelectorAll('.example-tab[data-example]');
  const exampleContents = document.querySelectorAll('.example-content');

  exampleTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const exampleId = tab.dataset.example;

      // Update active tab
      exampleTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Show/hide content
      exampleContents.forEach(content => {
        if (content.id === `example-${exampleId}`) {
          content.classList.add('active');
        } else {
          content.classList.remove('active');
        }
      });
    });
  });

});
