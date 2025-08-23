import { Mark, mergeAttributes, type MarkRenderHTMLProps, type Commands } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customHighlight: {
      /**
       * Set a highlight mark with a specific color
       */
      setCustomHighlight: (attributes?: { color: string }) => ReturnType;
      /**
       * Toggle a highlight mark with a specific color
       */
      toggleCustomHighlight: (attributes?: { color: string }) => ReturnType;
      /**
       * Unset a highlight mark
       */
      unsetCustomHighlight: () => ReturnType;
    };
  }
}

export const CustomHighlight = Mark.create({
  name: 'customHighlight',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const color = element.getAttribute('data-color') || element.style.backgroundColor;
          return color || null;
        },
        renderHTML: (attributes: { color: string | null }) => {
          if (attributes.color) {
            return {
              'data-color': attributes.color,
              style: `background-color: ${attributes.color}`,
            };
          }
          return {};
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'mark',
        getAttrs: (element: HTMLElement) => {
          const color = element.getAttribute('data-color') || element.style.backgroundColor;
          if (color) {
            return { color };
          }
          return null;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }: MarkRenderHTMLProps) {
    return ['mark', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setCustomHighlight: (attributes?: { color: string }) => ({ commands }: { commands: Commands<any> }) => {
        return commands.setMark(this.name, attributes);
      },
      toggleCustomHighlight: (attributes?: { color: string }) => ({ commands }: { commands: Commands<any> }) => {
        return commands.toggleMark(this.name, attributes);
      },
      unsetCustomHighlight: () => ({ commands }: { commands: Commands<any> }) => {
        return commands.unsetMark(this.name);
      },
    };
  },
});