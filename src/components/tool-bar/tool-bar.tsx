import React, { useRef } from "react";

import {
  CommandBar,
  ICommandBarItemProps,
  CommandButton,
  Checkbox,
  IIconProps,
} from "@fluentui/react";

export interface ToolBarProps {
  onMinifyClick: () => void;
  onPrettifyClick: () => void;
  onClearClick: () => void;
  onAutoPrettifyChange: () => void;
  onDownloadClick: () => void;
  onCompareClick: () => void;
  onUploadClick: (fileContent: File) => void;
  isAutoPrettifyOn: boolean;
  isCompareMode?: boolean;
  toolTexts: any;
}

interface FileUploaderProps {
  onFileHandle: (fileContent: File) => void;
  text: any;
}

// Need to fix: hover is not working
export const FileUploader: React.FC<FileUploaderProps> = ({ onFileHandle,text }) => {
  const inputFileRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    if (inputFileRef.current) {
      // upload the same file
      inputFileRef.current.value = "";
      inputFileRef.current.click();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const fileUploaded = e.target.files[0];
    onFileHandle(fileUploaded);
  };

  const uploadIcon: IIconProps = {
    iconName: "Upload",

  };

  return (
    <>
      <CommandButton iconProps={uploadIcon} text={text}  onClick={handleUploadClick} />
      <input
        ref={inputFileRef}
        style={{ display: "none" }}
        onChange={handleChange}
        type="file"
        accept="application/json"
      />
    </>
  );
};

export const ToolBar: React.FC<ToolBarProps> = ({
  onMinifyClick,
  onPrettifyClick,
  isAutoPrettifyOn,
  onAutoPrettifyChange,
  onClearClick,
  onDownloadClick,
  onUploadClick,
  onCompareClick,
  isCompareMode = false,
  toolTexts
}) => {
  const compareButtonText = isCompareMode ? (toolTexts.close_compare || "Close Compare") : toolTexts.compare;
  const leftItems: ICommandBarItemProps[] = [
    {
      key: "upload",
      onRender: () => <FileUploader onFileHandle={onUploadClick} text={toolTexts.upload} />,
    },
    {
      key: "download",
      text: toolTexts.download,
      ariaLabel: "Grid view",
      iconProps: { iconName: "Download" },
      onClick: onDownloadClick,
    },
    {
      key: "clear",
      text: toolTexts.clear,
      iconProps: { iconName: "Delete" },
      onClick: onClearClick,
    },
    {
      key: "minify",
      text: toolTexts.compact,
      iconProps: { iconName: "MinimumValue" },
      onClick: onMinifyClick,
      disabled: isAutoPrettifyOn,
    },
    {
      key: "format",
      text: toolTexts.format,
      iconProps: { iconName: "Code" },
      onClick: onPrettifyClick,
      disabled: isAutoPrettifyOn,
    },
    {
      key: "auto-prettify",
      onRender: () => (
        <CommandButton>
          <Checkbox
            label={toolTexts.auto_format}
            onChange={onAutoPrettifyChange}
            checked={isAutoPrettifyOn}
          />
        </CommandButton>
      ),
    },
    {
        key: "compare",
        text: compareButtonText,
        iconProps: { iconName: isCompareMode ? "ClearFormatting" : "DiffSideBySide" },
        onClick: onCompareClick,
        buttonStyles: isCompareMode
          ? {
              root: {
                background: "#eef6ff",
                border: "1px solid #93c5fd",
              },
            }
          : undefined,
      },
  ];

  return (
    <CommandBar
      styles={{
        root: {
          alignItems: "center",
          //borderTop: "5px solid rgb(237, 235, 233)",
        },
      }}
      items={leftItems}
      ariaLabel="json content commands"
    />
  );
};
