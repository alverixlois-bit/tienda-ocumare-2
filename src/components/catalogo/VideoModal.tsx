"use client";

import React from "react";
import { X, Video } from "lucide-react";

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string | null;
  titulo: string;
}

export function VideoModal({ isOpen, onClose, videoUrl, titulo }: VideoModalProps) {
  if (!isOpen || !videoUrl) return null;

  // Formatear URL de YouTube a embed si aplica
  let embedUrl = videoUrl;
  if (videoUrl.includes("youtube.com/watch?v=")) {
    embedUrl = videoUrl.replace("watch?v=", "embed/");
  } else if (videoUrl.includes("youtu.be/")) {
    embedUrl = videoUrl.replace("youtu.be/", "youtube.com/embed/");
  }

  const esIframe = embedUrl.includes("youtube.com") || embedUrl.includes("vimeo.com");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-white text-sm truncate max-w-md">
              Demostración: {titulo}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative aspect-video bg-black flex items-center justify-center">
          {esIframe ? (
            <iframe
              src={embedUrl}
              title={titulo}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0"
            />
          ) : (
            <video
              src={videoUrl}
              controls
              autoPlay
              className="w-full h-full object-contain"
            />
          )}
        </div>
      </div>
    </div>
  );
}
