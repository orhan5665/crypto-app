// src/EditorComponent.jsx

import React from 'react';
import Editor from '@monaco-editor/react';

const EditorComponent = ({ code, onCodeChange }) => {
  const handleEditorChange = (value) => {
    onCodeChange(value);
  };

  return (
    <Editor
      height="30vh"
      defaultLanguage="javascript"
      theme="vs-dark"
      value={code}
      onChange={handleEditorChange}
    />
  );
};

export default EditorComponent;