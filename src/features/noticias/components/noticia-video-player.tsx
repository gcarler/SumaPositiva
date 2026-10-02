"use client";

import { useMemo } from "react";
import { Film } from "lucide-react";

interface NoticiaVideoPlayerProps {
  url?: string;
  className?: string;
}

export function NoticiaVideoPlayer({ url, className = "" }: NoticiaVideoPlayerProps) {
  const videoData = useMemo(() => {
    if (!url || !url.trim()) return null;
    const cleanUrl = url.trim();

    // YouTube regex
    const ytMatch = cleanUrl.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
    );
    if (ytMatch && ytMatch[1]) {
      return {
        tipo: "youtube" as const,
        src: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?rel=0`,
      };
    }

    // Vimeo regex
    const vimeoMatch = cleanUrl.match(/(?:vimeo\.com\/)(\d+)/i);
    if (vimeoMatch && vimeoMatch[1]) {
      return {
        tipo: "vimeo" as const,
        src: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
      };
    }

    // Direct MP4 or video link
    if (cleanUrl.endsWith(".mp4") || cleanUrl.endsWith(".webm") || cleanUrl.includes("video")) {
      return {
        tipo: "direct" as const,
        src: cleanUrl,
      };
    }

    return {
      tipo: "iframe" as const,
      src: cleanUrl,
    };
  }, [url]);

  if (!videoData) return null;

  return (
    <div className={`overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-2)] ${className}`}>
      <div className="relative aspect-video w-full">
        {videoData.tipo === "direct" ? (
          <video
            src={videoData.src}
            controls
            className="h-full w-full object-cover"
          >
            Tu navegador no soporta el formato de video.
          </video>
        ) : (
          <iframe
            src={videoData.src}
            title="Video institucional de la política"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full border-0"
          />
        )}
      </div>
    </div>
  );
}
