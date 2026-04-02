"use client";

import { useEffect, type ReactNode } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";

type PushpinHtmlEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Pass pushpin id so editor remounts when switching rows */
  editorKey?: string;
};

function ToolbarButton({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`rounded px-2 py-1 text-sm font-medium transition-colors ${
        active
          ? "bg-sky-600 text-white dark:bg-sky-500"
          : "bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-700 dark:text-stone-200 dark:hover:bg-stone-600"
      }`}
    >
      {children}
    </button>
  );
}

export function PushpinHtmlEditor({
  value,
  onChange,
  placeholder = "Write content…",
  editorKey,
}: PushpinHtmlEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        code: false,
        horizontalRule: false,
      }),
      Underline,
      Placeholder.configure({ placeholder }),
    ],
    content: value && value.trim() ? value : "<p></p>",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "text-sm leading-relaxed text-stone-800 dark:text-stone-100 max-w-none",
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
  });

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (editor.isFocused) return;
    const next = value && value.trim() ? value : "<p></p>";
    if (editor.getHTML() !== next) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [editor, value, editorKey]);

  if (!editor) {
    return (
      <div className="min-h-[14rem] rounded-lg border border-stone-300 bg-stone-50 dark:border-stone-600 dark:bg-stone-800" />
    );
  }

  return (
    <div className="pushpin-html-editor overflow-hidden rounded-lg border border-stone-300 dark:border-stone-600">
      <div className="flex flex-wrap gap-1 border-b border-stone-200 bg-stone-100 px-2 py-1.5 dark:border-stone-600 dark:bg-stone-900/80">
        <ToolbarButton
          title="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          title="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          title="Underline"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <span className="underline">U</span>
        </ToolbarButton>
        <ToolbarButton
          title="Strikethrough"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <span className="line-through">S</span>
        </ToolbarButton>
        <span
          className="mx-1 w-px self-stretch bg-stone-300 dark:bg-stone-600"
          aria-hidden
        />
        <ToolbarButton
          title="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          • List
        </ToolbarButton>
      </div>
      <div className="bg-white px-3 py-2 dark:bg-stone-800">
        <EditorContent editor={editor} />
      </div>
      <p className="border-t border-stone-200 px-2 py-1 text-xs text-stone-500 dark:border-stone-600 dark:text-stone-400">
        Paragraphs: press Enter · New line in same paragraph: Shift+Enter
      </p>
    </div>
  );
}
