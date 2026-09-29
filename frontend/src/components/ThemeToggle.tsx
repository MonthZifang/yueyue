import { useTheme } from '../store';

export default function ThemeToggle() {
  const dark = useTheme((s) => s.dark);
  const toggle = useTheme((s) => s.toggle);
  return (
    <button
      type="button"
      onClick={toggle}
      className="btn-ghost !px-3"
      aria-label="切换主题"
      title={dark ? '切换到浅色' : '切换到深色'}
    >
      {dark ? '☾' : '☀'}
    </button>
  );
}
