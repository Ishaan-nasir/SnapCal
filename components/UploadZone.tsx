"use client";

import { UploadCloud, Crop, Check, RefreshCw } from "lucide-react";
import React, { DragEvent, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
  large?: boolean;
}

type CropBox = { x: number; y: number; w: number; h: number };

export default function UploadZone({ onFileSelect, isLoading }: UploadZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [cropBox, setCropBox] = useState<CropBox | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // ── File selection ──────────────────────────────────────────────
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(true);
  };
  const handleDragLeave = () => setIsDragActive(false);
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0]);
  };
  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file (png, jpg, jpeg).");
      return;
    }
    setOriginalFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setCropBox(null);
  };
  const handleReset = () => {
    setPreviewUrl(null);
    setOriginalFile(null);
    setCropBox(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Crop drawing (mouse events on the overlay div) ──────────────
  const getRelativePos = (e: React.MouseEvent) => {
    const rect = overlayRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(e.clientX - rect.left, rect.width)),
      y: Math.max(0, Math.min(e.clientY - rect.top, rect.height)),
    };
  };
  const onMouseDown = (e: React.MouseEvent) => {
    const pos = getRelativePos(e);
    setDragStart(pos);
    setIsDrawing(true);
    setCropBox({ x: pos.x, y: pos.y, w: 0, h: 0 });
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !dragStart) return;
    const pos = getRelativePos(e);
    setCropBox({
      x: Math.min(dragStart.x, pos.x),
      y: Math.min(dragStart.y, pos.y),
      w: Math.abs(pos.x - dragStart.x),
      h: Math.abs(pos.y - dragStart.y),
    });
  };
  const onMouseUp = () => setIsDrawing(false);

  // ── Confirm crop: draw on canvas → toBlob → new File ───────────
  const handleConfirmCrop = () => {
    if (!imageRef.current || !cropBox || !originalFile || !overlayRef.current) return;
    if (cropBox.w < 20 || cropBox.h < 20) return;

    const img = imageRef.current;
    const rect = overlayRef.current.getBoundingClientRect();

    // Scale from displayed pixels → natural image pixels
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(cropBox.w * scaleX);
    canvas.height = Math.round(cropBox.h * scaleY);

    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(
      img,
      Math.round(cropBox.x * scaleX),
      Math.round(cropBox.y * scaleY),
      canvas.width,
      canvas.height,
      0, 0,
      canvas.width,
      canvas.height
    );

    canvas.toBlob((blob) => {
      if (!blob) return;
      const croppedFile = new File([blob], originalFile.name, { type: "image/png" });
      onFileSelect(croppedFile);
    }, "image/png");
  };

  const cropIsValid = cropBox && cropBox.w >= 20 && cropBox.h >= 20;

  // ── CROP UI: shown once an image is selected ────────────────────
  if (previewUrl) {
    return (
      <div className="flex flex-col gap-3 w-full">
        {/* Hint banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 flex items-start gap-2">
          <Crop className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-700 leading-snug">
            <strong>Draw a box</strong> around just the timetable grid.
            Excluding the faculty table dramatically improves accuracy and speed.
          </p>
        </div>

        {/* Image + drag overlay */}
        <div
          ref={overlayRef}
          className="relative w-full overflow-hidden rounded-xl border-2 border-blue-300 select-none"
          style={{ maxHeight: 320, cursor: isLoading ? "default" : "crosshair" }}
          onMouseDown={isLoading ? undefined : onMouseDown}
          onMouseMove={isLoading ? undefined : onMouseMove}
          onMouseUp={isLoading ? undefined : onMouseUp}
          onMouseLeave={isLoading ? undefined : onMouseUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imageRef}
            src={previewUrl}
            alt="Timetable preview"
            className="w-full object-contain pointer-events-none block"
            style={{ maxHeight: 320 }}
            draggable={false}
          />

          {/* SVG crop overlay */}
          {cropBox && cropBox.w > 4 && cropBox.h > 4 && (
            <svg
              className="absolute inset-0 pointer-events-none"
              style={{ width: "100%", height: "100%" }}
            >
              <defs>
                <mask id="cropMask">
                  <rect width="100%" height="100%" fill="white" />
                  <rect x={cropBox.x} y={cropBox.y} width={cropBox.w} height={cropBox.h} fill="black" />
                </mask>
              </defs>
              {/* Dark vignette outside selection */}
              <rect width="100%" height="100%" fill="rgba(0,0,0,0.45)" mask="url(#cropMask)" />
              {/* Dashed selection border */}
              <rect
                x={cropBox.x} y={cropBox.y}
                width={cropBox.w} height={cropBox.h}
                fill="rgba(59,130,246,0.08)"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeDasharray="6 3"
              />
              {/* Corner handles */}
              {[
                [cropBox.x, cropBox.y],
                [cropBox.x + cropBox.w, cropBox.y],
                [cropBox.x, cropBox.y + cropBox.h],
                [cropBox.x + cropBox.w, cropBox.y + cropBox.h],
              ].map(([cx, cy], i) => (
                <circle key={i} cx={cx} cy={cy} r={4} fill="#3b82f6" />
              ))}
            </svg>
          )}

          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center gap-3 rounded-xl">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <p className="text-sm font-medium text-gray-600">Analyzing timetable…</p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        {!isLoading && (
          <>
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-4 py-2 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                New Image
              </button>
              <button
                onClick={handleConfirmCrop}
                disabled={!cropIsValid}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                  cropIsValid
                    ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                )}
              >
                <Check className="h-4 w-4" />
                {cropIsValid ? "Analyze Selection" : "Draw a selection first"}
              </button>
            </div>
            {!cropIsValid && (
              <p className="text-center text-xs text-gray-400">
                Click and drag to draw a box around the timetable grid rows
              </p>
            )}
          </>
        )}
      </div>
    );
  }

  // ── DEFAULT UPLOAD ZONE ─────────────────────────────────────────
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-2xl transition-colors cursor-pointer w-full mx-auto",
        isDragActive ? "border-blue-500 bg-blue-50/50" : "border-gray-300 bg-gray-50 hover:bg-gray-100",
        isLoading && "opacity-50 cursor-not-allowed pointer-events-none"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      <div className="bg-white p-4 rounded-full shadow-sm mb-4">
        {isLoading ? (
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        ) : (
          <UploadCloud className="h-8 w-8 text-blue-600" />
        )}
      </div>
      <p className="text-sm font-medium text-gray-700">
        {isLoading ? "Parsing timetable… this takes a few seconds" : "Drag & Drop your timetable image here"}
      </p>
      {!isLoading && (
        <p className="text-xs text-gray-500 mt-2">or click to browse from your device</p>
      )}
    </div>
  );
}
