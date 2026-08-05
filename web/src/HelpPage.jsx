import React, { useState } from 'react';
import { HELP_TOPICS } from './helpTopics.jsx';

/** Страница «Справка»: слева — список тем, справа — содержимое с иллюстрациями */
export default function HelpPage({ isAdmin }) {
  const topics = HELP_TOPICS.filter((t) => !t.adminOnly || isAdmin);
  const [topicId, setTopicId] = useState(topics[0].id);
  const topic = topics.find((t) => t.id === topicId) || topics[0];

  return (
    <div className="help-layout">
      <nav className="help-nav">
        {topics.map((t) => (
          <button
            key={t.id}
            className={'help-nav-item' + (t.id === topic.id ? ' active' : '')}
            onClick={() => setTopicId(t.id)}
          >
            {t.title}
          </button>
        ))}
      </nav>
      <article className="help-content">
        <h2>{topic.title}</h2>
        {topic.body}
      </article>
    </div>
  );
}
