type Props = {
  text: string;
  className?: string;
};

export function TypewriterDecor({ text, className = '' }: Props) {
  return (
    <div className={`typewriter-shell ${className}`.trim()}>
      <span className="typewriter-base">{text}</span>
      <span aria-hidden className="typewriter-overlay">
        {text}
      </span>
    </div>
  );
}
