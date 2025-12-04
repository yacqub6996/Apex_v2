import { CloudUpload } from "@mui/icons-material";
import Button from '@mui/material/Button';

interface FileUploadBoxProps {
  label: string;
  description?: string;
  acceptedTypes?: string;
  file?: File | null;
  onSelect: (file: File | null) => void;
  className?: string;
}

export const FileUploadBox = ({ 
  label, 
  description, 
  acceptedTypes = 'image/*,application/pdf', 
  file, 
  onSelect,
  className = ''
}: FileUploadBoxProps) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.item(0) ?? null;
    onSelect(selected);
  };

  return (
    <label className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border-secondary bg-bg-primary px-6 py-8 text-center transition hover:border-brand ${className}`}>
      <input 
        type="file" 
        accept={acceptedTypes} 
        className="hidden" 
        onChange={handleFileChange} 
      />
      <CloudUpload className="text-brand" sx={{ fontSize: 32 }} aria-hidden="true" />
      <div>
        <p className="text-sm font-medium text-fg-primary">{label}</p>
        {description && <p className="text-xs text-fg-tertiary">{description}</p>}
      </div>
      {file ? (
        <p className="text-xs text-fg-secondary">{file.name}</p>
      ) : (
        <p className="text-xs text-fg-tertiary">Tap to upload</p>
      )}
      {file && (
        <Button
          size="small"
          variant="text"
          onClick={(event) => {
            event.preventDefault();
            onSelect(null);
          }}
        >
          Remove
        </Button>
      )}
    </label>
  );
};

