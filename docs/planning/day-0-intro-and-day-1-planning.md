# Day 0 (Intro) and Day 1 Planning

## Day 0: Introduction Video

**Purpose**: Set the stage before Day 1 begins

**Content to cover**:
- The song: "12 Days of Christmas" history and meaning
- The metaphors (Gift-Giver primary, Builder's Chorus secondary)
- What we're building: 12 storytelling tools
- The team: David, Mary, Jan, Steve
- The vision: Day 12 culminates in a visual narrative

**Not needed**: Deep technical dive (that's Day 1)

---

## Day 1: Tech Stack Setup

### What We're Building

**NOT**:
- Rebuilding Storyline App
- Part of FliVideo
- A chatbot UI

**YES**:
- Standalone set of tools
- Client/server architecture (like Storyline/FliHub pattern)
- Socket.io for real-time communication
- File system interaction
- Claude SDK as engine only (not chatbot UI)

### Architecture Decision

```
Client (React/Vite)
    ↕ Socket.io
Server (Express/Node)
    ↕ APIs
External Services (FAL, KIE, 11 Labs, Suno)
```

### API Accounts Needed

| Service | Purpose | Status |
|---------|---------|--------|
| 11 Labs | Voice generation | Have account |
| FAL.AI | Image/video generation | Need to set up |
| KIE.AI | Multimodal (image/video/audio) | Need to set up |
| Suno | Music generation | Need to check |
| Anthropic | Claude SDK | Have account |

### Claude SDK Usage

**Using**: Area 2 from 007-bmad-claude-sdk (simple SDK calls)
- 38 lines minimal pattern
- `query()` for one-shot prompts
- No chatbot UI complexity

**Not Using**: Area 1 (full chat interface)

---

## Steve's Capabilities (From Conversations)

### What Steve Does
- ComfyUI workflows for video generation
- N8N workflows for automation
- First Frame → Last Frame animation technique
- UGC (User Generated Content) video creation
- Product placement in AI-generated videos

### Steve's Tech Stack

| Tool | Purpose |
|------|---------|
| ComfyUI | Video/image generation workflows |
| N8N | Automation orchestration |
| Telegram | Bot triggers (has easy API) |
| Google Drive | File storage |
| Google Sheets | Logging/tracking |
| FAL.AI | Image generation (Nano Banana) |
| KIE.AI | Video generation (VO3) |
| OpenAI | Prompt generation, image description |

### Steve's Workflow Pattern (N8N)

```
Telegram Trigger (image + caption)
    ↓
Store image to Google Drive
    ↓
Log to Google Sheets
    ↓
OpenAI: Describe image → JSON (woman, product, location, colors)
    ↓
OpenAI: Generate Nano Banana prompt (system prompt with rules)
    ↓
FAL.AI: Generate image
    ↓
Wait for completion
    ↓
OpenAI: Generate video script for VO3
    ↓
KIE.AI: Generate video (VO3)
    ↓
Switch: Check status (error/progress/complete)
    ↓
Output video + social media captions
```

### Why Telegram (Not WhatsApp)

Steve chose Telegram because:
- **Native N8N support**: Built-in trigger nodes, easy webhook setup
- **Bot creation**: Create a bot and get API token in <10 seconds
- **Open API**: WhatsApp is "walled off" and complicated to connect
- **Slack also works**: Native N8N support, but Telegram is simpler

### N8N AI Agent Capabilities

The N8N AI Agent node provides:
- **Model flexibility**: Connect any LLM (OpenAI, Claude, etc.)
- **Memory**: Optional conversation memory for multi-turn
- **Structured output**: Define exact JSON schema for downstream nodes
- **No code node needed**: LLM outputs directly in required format

### System Prompt Pattern (Steve's Formula)

For reliable LLM outputs, Steve's prompts include:
1. **Task definition**: "Your task is to..."
2. **Input references**: Image description, user caption
3. **Guidelines**: How to approach the task
4. **Rules**: Hard constraints
5. **Checklist**: Items to verify
6. **Good example**: What success looks like
7. **Bad example**: What to avoid

### Async Task Handling Pattern

For image/video generation (FAL, KIE):
```
POST request (prompt, image URL)
    ↓
Receive task_id
    ↓
Wait node (few seconds)
    ↓
Poll task_id for status
    ↓
Switch node:
  - "error" → Send Telegram error message
  - "in_progress" → Loop back to wait
  - "completed" → Download and continue
```

**Why track errors?**: Without error handling, you never know why a workflow failed. Content policy violations are common.

### Video Model Prompting Differences

Each model has unique prompting requirements:

| Model | Prompt Style | Duration |
|-------|--------------|----------|
| VO3 | Natural language or JSON | 5-10 sec |
| Kling | Specific format | 5-8 sec |
| WAN2.1 | Animation prompts | ~5 sec (81 frames) |

**JSON prompt structure** (some models):
```json
{
  "environment": "hotel room",
  "background": "...",
  "character": "woman holding product",
  "product": "bag of gummies",
  "scene_0_to_3": "woman talks to camera",
  "scene_3_to_6": "holds up product"
}
```

### Key Insights from Steve

1. **Playground first**: Always test prompts in the API playground before putting in N8N
2. **Error handling**: Track errors via Telegram messages
3. **Structured output**: Tell LLM exactly what JSON format you need for next webhook
4. **System prompts**: Guidelines, rules, checklist, good/bad examples
5. **Task polling**: Video generation requires waiting for success flag
6. **Content policy**: Can trigger errors, need to handle gracefully
7. **Credits**: You don't get charged when errors occur
8. **Burn credits learning**: Test in playground, accept some credit burn during iteration

---

## Diffusion Model Pipeline (Steve's Infographics)

### The 5-Step Pipeline

```
TEXT → MEANING (embeddings) → NOISE → STRUCTURED LATENT → PIXEL IMAGE
```

1. **Training Phase**: Model learns to remove noise from billions/trillions of images
   - Learns patterns: not just "dog" or "cat" but also "comic style", "realism", "composition"
   - Model doesn't store images — it learns how to remove noise intelligently
   - Learns: shapes, faces, lighting, styles, materials, composition

2. **Text Encoder**: Prompt → vectors (mathematical meaning)
   - Converts words into numerical vectors (embeddings)
   - Encodes: subject, style, mood, camera, lighting, concepts
   - Result: The model now understands what you want, mathematically

3. **Latent Space**: "The Hidden Image Playground"
   - Starts empty — it's latent, waiting
   - Much smaller than final resolution (faster to process)
   - Holds compressed image information
   - This is where the image forms mathematically

4. **KSampler**: Sculpts image from noise over X steps (20-50 typical)
   - Each step: model predicts what noise should be removed
   - Text meaning guides the refinement
   - Can have multiple KSamplers (one for scene, one for animation frames)
   - For video: 4 sec at 16fps = ~81 sample images

5. **VAE Decode**: Latent → actual pixels
   - Converts hidden mathematical representation to visible pixels
   - Restores: fine texture, skin detail, lighting gradients, color

### Key Parameters

| Parameter | What it does |
|-----------|--------------|
| Steps | How refined the image becomes (more steps = more refinement) |
| CFG (Classifier-Free Guidance) | Low = loose/creative, High = strict/obedient to prompt |
| Seed | Locks randomness for repeatability |

### LoRAs (Low-Rank Adaptation)

**What they are:**
- Small, lightweight add-on files (20-200MB, typically .safetensors)
- Trained on small dataset (10-200 images)
- Add new style, character, or concept to base model

**How they work:**
- Activated by typing a token in your prompt (e.g., `<sadi_ai_v3>`)
- LoRA modifies UNet noise predictions during denoising
- Blends seamlessly with base model output

**Strength control:**
| Strength | Effect |
|----------|--------|
| 0.3 | Subtle influence |
| 1.0 | Balanced blend |
| 1.5 | Dominant style/character |

**Key insight:** Base model builds the world (composition, lighting, physics, structure). LoRA adds the concept (specific style, character identity, unique object). Both work together.

---

## ComfyUI Workflow (First Frame → Last Frame)

### Steve's Animation Workflow

1. **Load models**: WAN2.1 (MOE - Mixture of Experts)
   - **High model**: handles motion
   - **Low model**: handles detail filling
   - Process: starts at high → passes data → goes to low
   - **Speed LoRAs**: 50 steps → 4-8 steps (faster, slight quality/motion loss)
   - Without LoRAs: would be ~25 steps each (much longer render time)

2. **Set variables**: Static workflow variables referenced throughout
   - Width, height (e.g., 1280)
   - Number of frames (81 = ~5 seconds at 16fps)
   - **Resize node**: Normalizes images, crops, ensures divisible dimensions

3. **Two reference images**:
   - **First frame**: Starting position (e.g., zoomed out)
   - **Last frame**: Ending position (e.g., zoomed in)
   - Created in Nano Banana/Flux/zImage: "pull camera back 50 feet while maintaining characters and background"
   - Can use image-to-image variation for consistency

4. **Animation prompt**: Describes motion between frames
   - Example: "A woman and a black man are looking at each other. The woman is holding an orb down to her left leg and lifts it up to the sky. The woman turns to look at the camera as the camera slowly dollies forward. The black man looks to his left..."
   - Must describe congruent motion from first frame to last frame

5. **Negative prompt**: Common issues to avoid
   - Often Chinese prompts translated to English
   - Includes: fused fingers, wrong colors, common artifacts
   - WAN models are from China but understand English

6. **Two KSamplers** (Mixture of Experts):
   - **High**: steps 0-2 (creates motion)
   - **Low**: steps 2-4 (fills in detail)
   - Max steps capped at 4 with speed LoRAs
   - Both doing similar work but with different focus

7. **VAE Decode**: Latent → 81 individual frames
   - This is when it goes from "pixelated shit" to natural image
   - Without video combine, would output 81 separate images

8. **Video Combine node**: Frames → video file

### Frame Interpolation

- Model trained on 81 frames at 16fps (~5 seconds)
- Can interpolate to 30fps or higher frame rates
- Trade-off: more frames vs. processing time

### Extending Beyond 5 Seconds

Chain multiple sections using end-frame-as-start-frame technique:

```
Section 1: first frame → end frame A (5 sec)
Section 2: end frame A → end frame B (5 sec)
Section 3: end frame B → end frame C (5 sec)
...
Video Combine: All sections → final video
```

Each section is a copy of the workflow with different start/end frames and prompts.

**Why 81 frames / 5 seconds?**: Model trained on this length. If you put 120 frames, it can do it, but consistency breaks down.

### Alternative Workflows

Not limited to first-frame-last-frame:
- **One Animate model**: Have character dance, move, walk toward something
- **Text-to-video**: No reference images, pure prompt
- **Image-to-video**: Single reference image with motion prompt

Node-based system = do whatever you want.

---

## Steve's Role in 12 Days

- Build ComfyUI workflow that works for all 12 days
- Day 12: Integrate all tools into final visual narrative
- Provides: First Frame → Last Frame technique
- Provides: N8N orchestration patterns

---

## Capabilities for 12 Days of Claude-mas

Based on Steve's knowledge, here's what we can build:

### Image Generation (Days 1-3)
- **Text-to-image**: Flux, Nano Banana via FAL.AI
- **Image-to-image**: Camera zoom, style variations
- **Character consistency**: LoRAs for recurring characters
- **Style locking**: Same LoRA across all assets

### Video Generation (Days 4-7)
- **First Frame → Last Frame**: Controlled motion between two images
- **5-second clips**: Native model output (81 frames @ 16fps)
- **Chained sequences**: Multiple 5-sec clips combined
- **Motion types**: Dolly, zoom, character movement, object manipulation

### Automation (Days 8-10)
- **N8N orchestration**: Chain multiple AI services
- **Telegram triggers**: Easy input mechanism
- **Async handling**: Task polling for long renders
- **Error recovery**: Switch nodes for graceful failures
- **Structured prompts**: JSON output for downstream nodes

### Integration (Days 11-12)
- **UGC workflow**: Image + product + caption → video
- **Multi-model pipeline**: FAL (image) → KIE (video) → output
- **Social media**: Auto-generate platform-specific captions
- **Final narrative**: All tools combined into cohesive story

### What's Possible

| Capability | Tool | Output |
|------------|------|--------|
| Generate character images | FAL/Nano Banana | PNG/JPG |
| Animate between keyframes | ComfyUI/WAN2.1 | 5-sec video |
| Add voice/narration | 11 Labs | Audio |
| Add music | Suno | Audio |
| Orchestrate pipeline | N8N | Automated workflow |
| Generate scripts | Claude/GPT | Text/JSON |
| Product placement | Image-to-image | Contextual images |

---

## Steve's Educational Infographics

Steve created visual explainers that demonstrate his teaching capability:

1. **"How Diffusion Models Turn Text Into Images"**
   - 6-section visual pipeline
   - Training → Text Encoder → Latent Space → KSampler → Structured Latent → VAE Decode
   - One-line summary at footer

2. **"How LoRAs Work in Diffusion Models"**
   - What a LoRA is (mini add-on)
   - How LoRAs are trained (small dataset)
   - Strength control slider
   - Injection into denoising process
   - Base model vs LoRA responsibilities

3. **N8N Job Matching Workflow**
   - Daily trigger → Loop over jobs → AI Agent filtering → Email output
   - Shows practical automation beyond video generation

4. **ComfyUI Annotated Workflow**
   - Visual callouts: User Prompt, Negative Prompt, KSampler, VAE Decode, Final Image
   - Shows actual node layout

These infographics could become Day 1-2 content or educational assets.

---

## Reference

- Blog post: https://dreamingcomputers.com/ai-projects/first-frame-last-frame-comfyui-onitsuka-tiger-wan22/
- See `multimodal-api-platforms-research.md` for FAL/KIE details
- Steve's infographics: Available as reference for visual asset creation
