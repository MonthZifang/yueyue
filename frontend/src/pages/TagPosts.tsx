import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import type { Post } from '../types';
import PostCard from '../components/PostCard';

export default function TagPosts() {
  const { slug = '' } = useParams();
  const [items, setItems] = useState<Post[]>([]);

  useEffect(() => {
    api.listPosts({ tag: slug, pageSize: 50 }).then((d) => setItems(d.items));
  }, [slug]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">#{slug}</h1>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
      </div>
    </div>
  );
}
