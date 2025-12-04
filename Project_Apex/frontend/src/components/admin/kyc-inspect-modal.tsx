import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import type { KycApplicationDetail } from "@/api/models/KycApplicationDetail";
import type { KycDocumentPublic } from "@/api/models/KycDocumentPublic";
import { KycService } from "@/api/services/KycService";
import { saveAs } from "@/utils/download";
import { toAbsoluteResource } from "@/utils/url";

interface KycInspectModalProps {
  open: boolean;
  userId?: string | null;
  onClose: () => void;
}

const formatDateTime = (value?: string | null) =>
  value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "N/A";

export const KycInspectModal = ({ open, userId, onClose }: KycInspectModalProps) => {
  const [zoomed, setZoomed] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (url: string, filename: string) => {
    try {
      setDownloading(filename);
      await saveAs(url, filename);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Download failed", err);
    } finally {
      setDownloading(null);
    }
  };

  const { data, isLoading, isError } = useQuery<KycApplicationDetail>({
    queryKey: ["admin-kyc-detail", userId],
    queryFn: () => KycService.kycGetApplicationDetail(userId as string),
    enabled: open && !!userId,
  });

  const user = data?.user;
  const profile = data?.profile;
  const documents = useMemo(() => (data?.documents ?? []) as KycDocumentPublic[], [data]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ pr: 6 }}>
        KYC Details
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {isLoading ? (
          <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center" py={4}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">Loading KYC details…</Typography>
          </Stack>
        ) : isError ? (
          <Typography variant="body2" color="error.main">Unable to load KYC details.</Typography>
        ) : !data ? (
          <Typography variant="body2" color="text.secondary">No details found.</Typography>
        ) : (
          <Stack spacing={3}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">User</Typography>
              <Stack direction="row" spacing={1} alignItems="center" mt={0.5}>
                <Typography variant="body2" fontWeight={600}>{user?.full_name ?? user?.email}</Typography>
                <Typography variant="body2" color="text.secondary">• {user?.email}</Typography>
                {user?.kyc_status && <Chip size="small" className="capitalize" label={String(user.kyc_status)} />}
              </Stack>
            </Box>

            {profile && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Profile</Typography>
                <Stack spacing={0.5} mt={0.5}>
                  {profile.phone_number && <Typography variant="body2">Phone: {profile.phone_number}</Typography>}
                  {profile.country && <Typography variant="body2">Country: {profile.country}</Typography>}
                  {profile.address_line_1 && <Typography variant="body2">Address: {profile.address_line_1} {profile.address_line_2}</Typography>}
                  {profile.city && <Typography variant="body2">City: {profile.city}</Typography>}
                  {profile.postal_code && <Typography variant="body2">Postal: {profile.postal_code}</Typography>}
                </Stack>
              </Box>
            )}

            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>Documents</Typography>
              {documents.length === 0 ? (
                <Typography variant="body2" color="text.secondary">No documents uploaded.</Typography>
              ) : (
                <Stack spacing={2}>
                  {documents.map((doc) => (
                    <Box key={doc.id} className="rounded-xl border border-secondary p-3">
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Typography variant="body2" fontWeight={600} className="capitalize">{doc.document_type.replace(/_/g, " ")}</Typography>
                        <Typography variant="caption" color="text.secondary">Uploaded {formatDateTime(doc.created_at)}</Typography>
                      </Stack>

                      <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                        {doc.front_image_url && (
                          <div>
                            <div className="mb-1 flex items-center justify-between">
                              <p className="text-xs text-tertiary">Front</p>
                              <Button
                                size="small"
                                onClick={() => handleDownload(toAbsoluteResource(doc.front_image_url) || '', `${doc.document_type}-front`)}
                                disabled={downloading === `${doc.document_type}-front`}
                              >
                                {downloading === `${doc.document_type}-front` ? "Downloading..." : "Download"}
                              </Button>
                            </div>
                            <img
                              src={toAbsoluteResource(doc.front_image_url) || undefined}
                              alt={`${doc.document_type} front`}
                              crossOrigin="anonymous"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                              className="max-h-80 w-full rounded-lg border border-secondary object-contain"
                              style={{ cursor: "zoom-in", transform: zoomed === `${doc.id}-front` ? "scale(1.2)" : undefined }}
                              onClick={() => setZoomed(zoomed === `${doc.id}-front` ? null : `${doc.id}-front`)}
                            />
                          </div>
                        )}
                        {doc.back_image_url && (
                          <div>
                            <div className="mb-1 flex items-center justify-between">
                              <p className="text-xs text-tertiary">Back</p>
                              <Button
                                size="small"
                                onClick={() => handleDownload(toAbsoluteResource(doc.back_image_url) || '', `${doc.document_type}-back`)}
                                disabled={downloading === `${doc.document_type}-back`}
                              >
                                {downloading === `${doc.document_type}-back` ? "Downloading..." : "Download"}
                              </Button>
                            </div>
                            <img
                              src={toAbsoluteResource(doc.back_image_url) || undefined}
                              alt={`${doc.document_type} back`}
                              crossOrigin="anonymous"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                              className="max-h-80 w-full rounded-lg border border-secondary object-contain"
                              style={{ cursor: "zoom-in", transform: zoomed === `${doc.id}-back` ? "scale(1.2)" : undefined }}
                              onClick={() => setZoomed(zoomed === `${doc.id}-back` ? null : `${doc.id}-back`)}
                            />
                          </div>
                        )}
                      </div>
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
};
