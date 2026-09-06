import { Fragment } from "react";
import { Link } from "react-router-dom";
import { parseFaqAnswerParts } from "@/lib/faq-content";

type FaqAnswerProps = {
  answer: string;
  className?: string;
};

const FaqAnswer = ({ answer, className }: FaqAnswerProps) => {
  const paragraphs = answer.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);

  if (paragraphs.length === 0) return null;

  return (
    <div className={className}>
      {paragraphs.map((paragraph, paragraphIndex) => (
        <p key={paragraphIndex} className={paragraphIndex > 0 ? "mt-3" : undefined}>
          {parseFaqAnswerParts(paragraph).map((part, partIndex) => {
            if (part.type === "text") {
              return <Fragment key={partIndex}>{part.value}</Fragment>;
            }
            if (part.href.startsWith("/")) {
              return (
                <Link key={partIndex} to={part.href} className="text-gold hover:underline">
                  {part.label}
                </Link>
              );
            }
            return (
              <a
                key={partIndex}
                href={part.href}
                className="text-gold hover:underline"
                {...(part.href.startsWith("http")
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                {part.label}
              </a>
            );
          })}
        </p>
      ))}
    </div>
  );
};

export default FaqAnswer;
