create extension if not exists pgcrypto;
create extension if not exists vector;

create table if not exists video_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  source_key text not null,
  title text not null,
  duration_seconds numeric not null,
  fps numeric,
  width integer,
  height integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists video_assets_owner_id_idx on video_assets (owner_id);
create index if not exists video_assets_source_key_idx on video_assets (source_key);

create table if not exists video_segments (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references video_assets(id) on delete cascade,
  start_time_seconds numeric not null,
  end_time_seconds numeric not null,
  transcript_text text,
  visual_summary text,
  visual_tags text[],
  keywords text[],
  quality_score numeric default 0.5,
  embedding vector(768),
  search_tsv tsvector generated always as (
    to_tsvector('english', coalesce(transcript_text, '') || ' ' || coalesce(visual_summary, ''))
  ) stored,
  created_at timestamptz not null default now()
);

create index if not exists video_segments_video_id_idx on video_segments (video_id);
create index if not exists video_segments_search_tsv_idx on video_segments using gin (search_tsv);
create index if not exists video_segments_embedding_idx on video_segments using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create or replace function search_video_segments_text(
  query_text text,
  match_count int default 10,
  min_quality numeric default 0,
  owner_id_filter uuid default null,
  video_id_filter uuid default null
) returns table (
  id uuid,
  video_id uuid,
  start_time_seconds numeric,
  end_time_seconds numeric,
  transcript_text text,
  visual_summary text,
  visual_tags text[],
  keywords text[],
  quality_score numeric,
  similarity_score numeric
) language sql stable as $$
  select
    video_segments.id,
    video_segments.video_id,
    video_segments.start_time_seconds,
    video_segments.end_time_seconds,
    video_segments.transcript_text,
    video_segments.visual_summary,
    video_segments.visual_tags,
    video_segments.keywords,
    video_segments.quality_score,
    ts_rank_cd(video_segments.search_tsv, plainto_tsquery('english', query_text)) as similarity_score
  from video_segments
  join video_assets on video_assets.id = video_segments.video_id
  where video_segments.quality_score >= min_quality
    and (owner_id_filter is null or video_assets.owner_id = owner_id_filter)
    and (video_id_filter is null or video_segments.video_id = video_id_filter)
    and video_segments.search_tsv @@ plainto_tsquery('english', query_text)
  order by similarity_score desc
  limit match_count;
$$;

create or replace function search_video_segments(
  query_text text,
  query_embedding vector(768),
  match_count int default 10,
  min_quality numeric default 0,
  owner_id_filter uuid default null,
  video_id_filter uuid default null
) returns table (
  id uuid,
  video_id uuid,
  start_time_seconds numeric,
  end_time_seconds numeric,
  transcript_text text,
  visual_summary text,
  visual_tags text[],
  keywords text[],
  quality_score numeric,
  similarity_score numeric
) language sql stable as $$
  select
    video_segments.id,
    video_segments.video_id,
    video_segments.start_time_seconds,
    video_segments.end_time_seconds,
    video_segments.transcript_text,
    video_segments.visual_summary,
    video_segments.visual_tags,
    video_segments.keywords,
    video_segments.quality_score,
    ((1 - (video_segments.embedding <=> query_embedding)) * 0.6 +
     ts_rank_cd(video_segments.search_tsv, plainto_tsquery('english', query_text)) * 0.4) as similarity_score
  from video_segments
  join video_assets on video_assets.id = video_segments.video_id
  where video_segments.quality_score >= min_quality
    and video_segments.embedding is not null
    and (owner_id_filter is null or video_assets.owner_id = owner_id_filter)
    and (video_id_filter is null or video_segments.video_id = video_id_filter)
  order by similarity_score desc
  limit match_count;
$$;
