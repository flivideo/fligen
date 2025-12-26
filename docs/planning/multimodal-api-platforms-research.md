# Multimodal API Platforms Research

**Purpose**: Research on generative media API aggregators (image, video, audio)
**Use case**: Backend for 12 Days of Claude-mas apps
**Source**: ChatGPT conversation

---

## Key Distinction

These are **NOT** LLM aggregators (like OpenRouter for text).
These are **diffusion/media model aggregators** for generative media.

| Category | Examples |
|----------|----------|
| LLM Aggregators | OpenRouter, Together, Fireworks |
| Diffusion/Media Aggregators | fal.ai, kie.ai |
| Video Gen APIs | Pika, Runway |
| Audio Gen APIs | ElevenLabs, Suno |

---

## Platform 1: fal.ai

**URL**: https://fal.ai

**What it is**:
- Generative-media platform + inference infrastructure
- 600+ production-ready models
- Single unified API/SDK

**Modalities supported**:
- Image generation (Stable Diffusion, SDXL, Flux)
- Video generation
- Audio/voice
- 3D generation

**Key features**:
- Proprietary "fal Inference Engine" - up to 4x faster
- Serverless GPU backend (no infra management)
- Supports custom models + fine-tuning (LoRA)
- Pay-as-you-go pricing

**API style**:
```
/models/{model_name}/run

Examples:
- stabilityai/sdxl
- black-forest-labs/flux
- runwayml/gen2
```

**Good for**:
- Generative image/video tools
- Agent workflows that produce media
- Thumbnail generators
- Automatic artwork pipelines
- Multi-step diffusion workflows

---

## Platform 2: kie.ai

**URL**: https://kie.ai

**What it is**:
- Multimodal generative media aggregator + API
- Image, video, audio, AND some LLM/chat

**Video generation**:
- Veo 3.1
- Veo 3.1 Fast
- Runway Aleph

**Image generation**:
- 4o Image API
- Flux Kontext API
- Nano Banana API

**Audio/Music**:
- Suno API (various versions)

**Key features**:
- Unified API for multiple media types
- Pay-as-you-go (credit-based)
- Claims 99.9% uptime

**Caveats**:
- Quality/latency varies by model
- Need to verify underlying model for each call
- Check cost per output before heavy use

---

## Alternatives Mentioned

| Platform | Strengths |
|----------|-----------|
| Runway | Video + creative media generation, text-to-video |
| ElevenLabs | Voice/audio |
| Suno | Music generation |

---

---

## Evaluation Checklist

When evaluating platforms:
- [ ] Does it expose an API or SDK (not just UI)?
- [ ] What modalities? (image / video / audio / 3D)
- [ ] Cost model? (per-call, credits, subscription)
- [ ] Latency?
- [ ] Output quality & consistency?
- [ ] Custom model / fine-tuning support?

---

## Relevance to 12 Days of Claude-mas

These platforms could power:
- Thumbnail generators
- Video clip generators
- Audio/music for videos
- B-roll image generation
- Animated visuals
- Style-consistent brand assets
