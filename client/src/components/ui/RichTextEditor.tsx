import React, { useRef, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Enter text...',
  className = '',
}) => {
  const quillRef = useRef<ReactQuill>(null);

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'font': [] }],
      [{ 'size': [] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'indent': '-1'}, { 'indent': '+1' }],
      ['link', 'image', 'video'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      ['clean']
    ],
  };

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'link', 'image', 'video',
    'color', 'background',
    'align'
  ];

  return (
    <div className={`rich-text-editor ${className}`}>
      <style>{`
        .rich-text-editor .ql-container {
          min-height: 200px;
          font-size: 14px;
          background: rgb(249 250 251);
        }
        .dark .rich-text-editor .ql-container {
          background: rgb(31 41 55);
          color: white;
        }
        .rich-text-editor .ql-editor {
          min-height: 200px;
        }
        .rich-text-editor .ql-editor.ql-blank::before {
          color: rgb(156 163 175);
          font-style: normal;
        }
        .dark .rich-text-editor .ql-snow {
          border-color: rgb(55 65 81);
        }
        .dark .rich-text-editor .ql-toolbar {
          border-color: rgb(55 65 81);
          background: rgb(31 41 55);
        }
        .dark .rich-text-editor .ql-stroke {
          stroke: rgb(209 213 219);
        }
        .dark .rich-text-editor .ql-fill {
          fill: rgb(209 213 219);
        }
        .dark .rich-text-editor .ql-picker-label {
          color: rgb(209 213 219);
        }
        .dark .rich-text-editor .ql-editor {
          color: white;
        }
      `}</style>
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />
    </div>
  );
};

