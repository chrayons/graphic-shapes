# DESIGN_PRINCIPLES.md
> A reference guide for evaluating and giving feedback on visual design work.
> Use this to ground critique in established principles — not personal preference.

---

## How to Use This Document

When reviewing a design (screen, layout, component, illustration, poster, etc.), evaluate it against each of the principles below. For each one, ask:
- Is this principle present and working?
- Is it being violated in a way that weakens the design?
- What specific change would improve it?

Feedback should cite the principle by name, describe the observation concretely, and suggest a direction — not just flag problems.

---

## The 7 Core Principles

### 1. Emphasis
**What it is:** The focal point of a design — the most important element, and the hierarchy of everything else around it.

**What to look for:**
- Is it immediately clear what the viewer should look at first?
- Does the visual weight of elements match their informational importance?
- Is there a clear primary → secondary → tertiary reading order?

**Common violations:**
- Everything competes equally for attention (no hierarchy)
- The most visually dominant element is not the most important one
- Calls to action are undersized or visually buried

**Feedback framing:** *"The CTA doesn't read as primary — [X element] is pulling more visual weight. Try increasing the CTA's size or contrast to reestablish hierarchy."*

---

### 2. Balance and Alignment
**What it is:** The distribution of visual weight across a composition. Can be symmetrical (mirrored), asymmetrical (weighted but stable), or radial (circular).

**What to look for:**
- Does the layout feel stable, or does it tip to one side?
- Are elements aligned to a consistent grid or axis?
- Is asymmetry intentional and in tension, or is it accidental and uncomfortable?

**Common violations:**
- Elements that appear to float or drift without alignment
- Heavy imagery or text blocks that aren't counterbalanced
- Inconsistent left/right or top/bottom margins

**Feedback framing:** *"The left column is much heavier than the right — consider redistributing visual weight or anchoring the right side with a stronger element."*

---

### 3. Contrast
**What it is:** The degree of difference between elements — light vs. dark, large vs. small, bold vs. regular, colorful vs. neutral. Contrast creates separation, emphasis, and legibility.

**What to look for:**
- Is text readable against its background?
- Are distinct elements visually differentiated from each other?
- Is contrast doing the work of hierarchy without adding clutter?

**Common violations:**
- Low-contrast text (accessibility failure)
- Similar-weight typefaces at similar sizes used for different levels of hierarchy
- Backgrounds that compete with foreground content

**Feedback framing:** *"Body text on that background is under the 4.5:1 WCAG contrast ratio — bump the text to a darker tone or lighten the background."*

---

### 4. Repetition
**What it is:** Consistent reuse of visual elements (color, typeface, shape, spacing, style) across a composition to create cohesion and visual rhythm.

**What to look for:**
- Do repeated elements feel intentional and systematic?
- Is there a consistent visual language (type scale, color palette, icon style)?
- Does the layout feel like a designed system, or a collection of individual decisions?

**Common violations:**
- Multiple competing typefaces or font weights without a system
- Colors introduced once and never echoed elsewhere
- Inconsistent spacing between similar elements

**Feedback framing:** *"The button style changes between screens — establish one primary and one secondary button treatment and apply them consistently."*

---

### 5. Proportion
**What it is:** The size relationship between elements relative to each other and to the whole. Proportion communicates importance and creates visual harmony.

**What to look for:**
- Do size differences between elements feel intentional?
- Is the type scale creating meaningful distinctions (H1 vs. H2 vs. body)?
- Are images and text at appropriate scales for the medium and viewing distance?

**Common violations:**
- Headline and body text are nearly the same size
- Images that are too small to be impactful, or so large they overwhelm content
- Interface elements that don't scale sensibly at different screen sizes

**Feedback framing:** *"The heading and subheading are only 2px apart in size — increase the ratio so the hierarchy reads clearly at a glance."*

---

### 6. Movement
**What it is:** The path the viewer's eye travels through a composition. Movement is created through line, shape, directional cues, color progression, and layout.

**What to look for:**
- Does the eye enter the composition at the right place?
- Is there a natural reading path through the content?
- Are there elements that direct attention (arrows, lines, body language in photos, diagonal shapes)?

**Common violations:**
- Eye lands on a secondary element first
- No clear path — the eye wanders without landing anywhere
- Competing focal points that create visual confusion

**Feedback framing:** *"The photo subject is facing away from the headline — flip the image so their gaze pulls the viewer toward the key message."*

---

### 7. White Space (Negative Space)
**What it is:** The empty area around, between, and within elements. White space is not wasted space — it creates hierarchy, grouping, breathing room, and perceived quality.

**What to look for:**
- Does the layout feel cramped or cluttered?
- Is white space being used to group related elements and separate unrelated ones?
- Does the amount of white space around an element communicate its importance?

**Common violations:**
- Content crammed to the edges (insufficient margins)
- Related elements spaced far apart; unrelated elements too close (violates proximity)
- Dense layouts that feel overwhelming rather than organized

**Feedback framing:** *"The card content needs more internal padding — the text is touching the edge, which makes it feel low-quality and hard to scan."*

---

## Supporting Concepts

These aren't standalone principles but are often where feedback gets specific.

### Visual Hierarchy
The organized communication of relative importance across a layout. Built through size, contrast, color, spacing, and placement working together. Strong hierarchy = viewer understands priority instantly, without instruction.

### Proximity
Elements that are near each other are perceived as related. Use proximity to group logically related content and create separation between sections. If it looks close, it better *be* related.

### Typography
- Limit to 2–3 typefaces max; usually 1–2 is better
- Establish a clear type scale: heading / subheading / body / caption
- Line length: 45–75 characters per line for comfortable reading
- Line height: 1.4–1.6× for body text
- Typeface choice communicates personality — match it to the context

### Color
- Use a limited palette with clear roles: primary, secondary, accent, background, text
- Test in grayscale — if hierarchy breaks without color, it's not doing its job alone
- Check contrast ratios for accessibility (WCAG AA minimum: 4.5:1 for body text)
- Color carries meaning — be intentional, especially with red (error/warning) and green (success)

### Framing
How content is bounded, cropped, or contained within the layout. Good framing draws attention inward. Avoid tangent lines where the edge of a photo or container awkwardly touches another element.

### Gestalt Principles (perception shortcuts)
- **Similarity:** Things that look alike are perceived as a group
- **Closure:** The eye completes incomplete shapes
- **Figure/Ground:** The brain separates foreground from background
- **Continuity:** The eye follows implied lines or curves

---

## Feedback Quality Standards

Good design feedback is:
- **Specific** — names the element, not just "it feels off"
- **Principle-grounded** — cites which principle is at play
- **Directional** — suggests a path forward, not just a problem
- **Separates preference from principle** — "this violates contrast" vs. "I don't like blue"

Avoid:
- Vague praise ("looks good!")
- Taste-based critique without grounding ("I'd make it more minimal")
- Prescribing the exact solution when the direction is what matters

---

*Sources: Vistaprint Design Hub — Principles of Design, Elements of Design, Hierarchy in Graphic Design, Graphic Design Layout*
