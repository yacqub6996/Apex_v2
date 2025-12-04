import { useState } from "react";

interface VideoPlayerProps {
  thumbnailUrl: string;
  src: string;
  className?: string;
}

export const VideoPlayer = ({ thumbnailUrl, src, className }: VideoPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className={`relative ${className}`}>
      {!isPlaying ? (
        <div className="relative cursor-pointer" onClick={() => setIsPlaying(true)}>
          <img
            src={thumbnailUrl}
            alt="Video thumbnail"
            className="w-full h-full object-cover rounded-lg"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
            <svg
              className="w-12 h-12 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      ) : (
        <video
          controls
          autoPlay
          className="w-full h-full rounded-lg"
          src={src}
        />
      )}
    </div>
  );
};
