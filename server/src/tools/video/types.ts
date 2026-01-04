// Video generation types for FR-10

/**
 * Provider identifier for video generation
 */
export type VideoProvider = 'kie' | 'fal';

/**
 * Video model identifier
 */
export type VideoModel = 'veo3' | 'kling-o1' | 'wan-flf2v';

/**
 * Video task status
 */
export type VideoStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Video generation request
 */
export interface VideoGenerateRequest {
  provider: VideoProvider;
  startShotId: string;
  endShotId: string;
  prompt?: string;
  duration: number; // 5 or 10 seconds
  model: VideoModel;
}

/**
 * Video generation response (initial)
 */
export interface VideoGenerateResponse {
  taskId: string;
  status: VideoStatus;
  estimatedTime?: number;
}

/**
 * Video task result
 */
export interface VideoTask {
  id: string;
  filename?: string;
  url?: string;
  startShot: string;
  endShot: string;
  provider: VideoProvider;
  model: VideoModel;
  duration: number;
  status: VideoStatus;
  progress?: number;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

/**
 * Video index file structure
 */
export interface VideoIndex {
  videos: VideoTask[];
}

/**
 * Video health check response
 */
export interface VideoHealthResponse {
  kie: {
    configured: boolean;
    authenticated: boolean;
    error?: string;
  };
  fal: {
    configured: boolean;
    authenticated: boolean;
    error?: string;
  };
}

/**
 * KIE.AI Veo task response
 */
export interface KieVeoTaskResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
  };
}

/**
 * KIE.AI Veo task result response
 */
export interface KieVeoTaskResult {
  code: number;
  msg: string;
  data: {
    taskId: string;
    status?: string;
    successFlag?: number;
    response?: {
      videoUrl?: string;
      resultVideoUrl?: string;
      resultUrls?: string[];
    };
    progress?: number;
    errorMessage?: string;
    createTime?: string;
    completeTime?: string;
  };
}

/**
 * FAL video response
 */
export interface FalVideoResponse {
  video: {
    url: string;
    content_type?: string;
    file_name?: string;
    file_size?: number;
  };
  seed?: number;
}

/**
 * Model configuration for video
 */
export interface VideoModelConfig {
  id: string;
  name: string;
  provider: VideoProvider;
  supportsDuration: number[];
  costEstimate: number; // per generation
}

/**
 * Available video models
 */
export const VIDEO_MODELS: Record<VideoModel, VideoModelConfig> = {
  'veo3': {
    id: 'veo3',
    name: 'Veo 3.1',
    provider: 'kie',
    supportsDuration: [5, 8],
    costEstimate: 0.25,
  },
  'kling-o1': {
    id: 'fal-ai/kling-video/o1/image-to-video',
    name: 'Kling O1',
    provider: 'fal',
    supportsDuration: [5, 10],
    costEstimate: 0.56,
  },
  'wan-flf2v': {
    id: 'fal-ai/wan/v2.1/flf2v',
    name: 'Wan 2.1 FLF2V',
    provider: 'fal',
    supportsDuration: [3],
    costEstimate: 0.15,
  },
};
