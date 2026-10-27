export function selectExecutionVideo<T extends { gym_id: string | null; video_path: string }>(videos: T[], gymId: string | null, allowOtherGym = false): T | null {
  const available = videos.filter(video => video.video_path.trim());
  return (gymId ? available.find(video => video.gym_id === gymId) : undefined)
    ?? available.find(video => video.gym_id === null)
    ?? (allowOtherGym ? available[0] : undefined)
    ?? null;
}