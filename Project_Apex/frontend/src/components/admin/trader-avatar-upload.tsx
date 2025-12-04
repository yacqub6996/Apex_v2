import { useRef, useState, ChangeEvent } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { AvatarPreview } from "@/components/profile-picture-upload/AvatarPreview";
import { ImageCropperDialog } from "@/components/profile-picture-upload/ImageCropperDialog";
import { uploadTraderAvatar } from "@/services/image-upload-service";
import { toAbsoluteResource } from "@/utils/url";

interface TraderAvatarUploadProps {
  traderId: string;
  traderName: string;
  onSuccess: (avatarUrl: string, updatedTrader: any) => void;
}

export const TraderAvatarUpload = ({
  traderId,
  traderName,
  onSuccess,
}: TraderAvatarUploadProps) => {
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [openCrop, setOpenCrop] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const pickAvatar = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(String(reader.result || ""));
      setOpenCrop(true);
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) pickAvatar(file);
    e.currentTarget.value = "";
  };

  const handleConfirmAvatar = async (blob: Blob) => {
    setOpenCrop(false);
    const res = await uploadTraderAvatar(traderId, blob);
    if (!res.ok) {
      alert(res.error || "Failed to upload avatar");
      return;
    }

    // Backend returns full TraderProfilePublic object with updated avatar_url
    const updatedTrader = res.data as any;
    const raw = updatedTrader?.avatar_url as string | undefined;
    const absoluteUrl = toAbsoluteResource(raw) || "";
    setAvatarPreview(absoluteUrl);

    onSuccess(absoluteUrl, updatedTrader);
  };

  return (
    <Box>
      <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
        Trader Avatar (optional)
      </Typography>
      <Stack direction="row" spacing={2} alignItems="center">
        <AvatarPreview src={avatarPreview || undefined} name={traderName} size={48} />
        <Button size="small" variant="outlined" onClick={() => fileInputRef.current?.click()}>
          Upload avatar
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          onChange={handleAvatarFileChange}
        />
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
        Square image recommended, 512×512, up to 5MB.
      </Typography>
      <ImageCropperDialog
        open={openCrop}
        src={cropSrc}
        onClose={() => setOpenCrop(false)}
        onConfirm={handleConfirmAvatar}
        aspect={1}
      />
    </Box>
  );
};
