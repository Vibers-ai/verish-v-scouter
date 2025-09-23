# 인플루언서 관리 시스템 - Supabase 데이터베이스 스키마

## 📋 개요

이 문서는 인플루언서 관리 시스템의 Supabase SQL 데이터베이스 스키마를 설명합니다. 기존 JSON 파일 기반 시스템에서 완전한 SQL 데이터베이스 시스템으로 마이그레이션이 완료되었습니다.

## 🗄️ 데이터베이스 테이블 구조

### 1. **influencers** (인플루언서 메인 테이블)

인플루언서의 모든 정보를 저장하는 핵심 테이블입니다.

#### 기본 정보 필드
| 필드명 | 타입 | 설명 | 제약조건 |
|--------|------|------|----------|
| `id` | BIGSERIAL | 고유 식별자 | PRIMARY KEY |
| `account_id` | VARCHAR(255) | 계정 ID | UNIQUE, NOT NULL |
| `author_name` | VARCHAR(255) | 작성자 이름 | NOT NULL |
| `author_id` | BIGINT | 작성자 ID | - |

#### 프로필 정보
| 필드명 | 타입 | 설명 |
|--------|------|------|
| `profile_intro` | TEXT | 프로필 소개 |
| `profile_entry` | VARCHAR(500) | 프로필 URL |
| `email` | VARCHAR(255) | 이메일 주소 |

#### 통계 정보
| 필드명 | 타입 | 설명 | 기본값 |
|--------|------|------|--------|
| `follower_count` | BIGINT | 팔로워 수 | 0 |
| `follower_count_formatted` | VARCHAR(20) | 포맷된 팔로워 수 (예: "1.6M") | - |
| `upload_count` | INTEGER | 업로드 수 | 0 |
| `likes_count` | BIGINT | 좋아요 수 | 0 |
| `shares_count` | BIGINT | 공유 수 | 0 |
| `comments_count` | BIGINT | 댓글 수 | 0 |
| `views_count` | BIGINT | 조회수 | 0 |

#### 비디오 정보
| 필드명 | 타입 | 설명 |
|--------|------|------|
| `video_caption` | TEXT | 비디오 캡션 |
| `video_duration` | INTEGER | 비디오 길이 (초) |
| `video_url` | VARCHAR(500) | 비디오 URL |
| `upload_time` | TIMESTAMP | 업로드 시간 |
| `music_title` | VARCHAR(255) | 음악 제목 |
| `music_artist` | VARCHAR(255) | 음악 아티스트 |

#### 성과 지표
| 필드명 | 타입 | 설명 |
|--------|------|------|
| `engagement_rate` | DECIMAL(10,6) | 참여율 |
| `view_ratio` | DECIMAL(10,6) | 조회 비율 |
| `comment_conversion` | DECIMAL(10,6) | 댓글 전환율 |
| `follower_quality` | DECIMAL(10,6) | 팔로워 품질 |
| `estimated_cpm` | DECIMAL(10,2) | 예상 CPM |
| `cost_efficiency` | DECIMAL(10,6) | 비용 효율성 |

#### 썸네일 정보
| 필드명 | 타입 | 설명 |
|--------|------|------|
| `thumbnail_url` | TEXT | 원본 썸네일 URL |
| `local_thumbnail` | VARCHAR(500) | 로컬 썸네일 경로 |
| `r2_thumbnail_url` | TEXT | R2 저장소 썸네일 URL |

#### 분류 정보
| 필드명 | 타입 | 설명 | 기본값 |
|--------|------|------|--------|
| `follower_tier` | VARCHAR(100) | 팔로워 등급 | - |
| `influencer_type` | VARCHAR(50) | 인플루언서 타입 | 'regular' |
| `priority` | VARCHAR(100) | 우선순위 | - |
| `original_id` | INTEGER | 원본 JSON ID | - |

#### 새로 추가된 필드
| 필드명 | 타입 | 설명 | 기본값 |
|--------|------|------|--------|
| `status` | VARCHAR(50) | 연락 상태 | 'none' |
| `scraping_round` | VARCHAR(50) | 스크래핑 라운드 | NOT NULL |
| `saved` | BOOLEAN | 저장 여부 | false |
| `created_at` | TIMESTAMP | 생성 시간 | NOW() |
| `updated_at` | TIMESTAMP | 수정 시간 | NOW() |

#### 인덱스
- `idx_influencer_type` - 인플루언서 타입별 검색
- `idx_status` - 연락 상태별 검색
- `idx_scraping_round` - 스크래핑 라운드별 검색
- `idx_saved` - 저장된 항목 필터링
- `idx_follower_count` - 팔로워 수 정렬
- `idx_views_count` - 조회수 정렬
- `idx_engagement_rate` - 참여율 정렬
- `idx_email` - 이메일 검색
- `idx_author_name` - 이름 검색

### 2. **influencer_tags** (태그 테이블)

인플루언서별 태그를 관리하는 테이블 (다대다 관계)

| 필드명 | 타입 | 설명 | 제약조건 |
|--------|------|------|----------|
| `id` | BIGSERIAL | 고유 식별자 | PRIMARY KEY |
| `influencer_id` | BIGINT | 인플루언서 ID | FOREIGN KEY → influencers(id) |
| `tag` | VARCHAR(100) | 태그 이름 | NOT NULL |
| `created_at` | TIMESTAMP | 생성 시간 | DEFAULT NOW() |

- **UNIQUE 제약**: (influencer_id, tag) - 중복 태그 방지
- **CASCADE DELETE**: 인플루언서 삭제 시 태그도 자동 삭제

### 3. **contact_statuses** (연락 상태 테이블)

인플루언서별 연락 상태를 추적하는 테이블

| 필드명 | 타입 | 설명 | 제약조건 |
|--------|------|------|----------|
| `id` | BIGSERIAL | 고유 식별자 | PRIMARY KEY |
| `influencer_id` | BIGINT | 인플루언서 ID | FOREIGN KEY → influencers(id), UNIQUE |
| `status` | VARCHAR(50) | 상태 값 | NOT NULL |
| `notes` | TEXT | 메모 | - |
| `updated_at` | TIMESTAMP | 수정 시간 | DEFAULT NOW() |
| `created_at` | TIMESTAMP | 생성 시간 | DEFAULT NOW() |

#### 상태 값 옵션
- `none` - 미연락
- `good` - 이사람 좋다
- `contacted` - 연락했음
- `no_response` - 회신 안옴
- `responded` - 회신 옴
- `rejected` - 거절

### 4. **influencer_summary** (통계 뷰)

인플루언서 타입별 집계 데이터를 제공하는 뷰

| 필드명 | 설명 |
|--------|------|
| `influencer_type` | 인플루언서 타입 ('regular', 'sales', 'all') |
| `total_influencers` | 총 인플루언서 수 |
| `total_views` | 총 조회수 |
| `total_followers` | 총 팔로워 수 |
| `total_likes` | 총 좋아요 수 |
| `total_comments` | 총 댓글 수 |
| `total_shares` | 총 공유 수 |
| `avg_engagement_rate` | 평균 참여율 |
| `avg_cpm` | 평균 CPM |

## 🔄 데이터 매핑 규칙

### Scraping Round 매핑
- `influencer_type: "regular"` → `scraping_round: "1"`
- `influencer_type: "sales"` → `scraping_round: "2"`
- 향후 추가 타입 → `"3"`, `"4"`, ...

## 🔒 보안 설정

### Row Level Security (RLS)
모든 테이블에 RLS가 활성화되어 있습니다:
- `influencers` 테이블
- `influencer_tags` 테이블
- `contact_statuses` 테이블

현재는 개발 편의를 위해 모든 작업이 허용되어 있으나, 프로덕션에서는 적절한 정책 설정이 필요합니다.

## ⚡ 트리거 및 함수

### update_updated_at_column()
레코드가 수정될 때마다 `updated_at` 필드를 자동으로 업데이트하는 트리거

적용 테이블:
- `influencers`
- `contact_statuses`

## 📊 데이터 통계 (마이그레이션 후)

- **총 인플루언서**: 679명
- **Regular 타입**: 679명 (scraping_round: 1)
- **Sales 타입**: 0명 (scraping_round: 2)
- **태그**: localStorage에서 마이그레이션
- **연락 상태**: localStorage에서 마이그레이션

## 🚀 성능 최적화

### 구현된 기능
1. **서버사이드 페이지네이션**: 대용량 데이터 효율적 처리
2. **인덱싱**: 빠른 검색 및 정렬
3. **집계 뷰**: 통계 데이터 사전 계산
4. **배치 작업**: 대량 데이터 입력 지원

### 검색 가능 필드
- 작성자 이름 (`author_name`)
- 계정 ID (`account_id`)
- 비디오 캡션 (`video_caption`)
- 이메일 (`email`)
- 태그 (연관 테이블 검색)

### 정렬 가능 필드
- 팔로워 수 (`follower_count`)
- 조회수 (`views_count`)
- 참여율 (`engagement_rate`)
- 좋아요 수 (`likes_count`)
- 예상 CPM (`estimated_cpm`)

## 💾 백업 및 복구

### 백업
Supabase 대시보드에서 자동 백업이 설정되어 있습니다.
- 일일 백업
- Point-in-time 복구 지원

### 수동 백업
```sql
-- 전체 데이터 내보내기
COPY influencers TO '/path/to/backup.csv' WITH CSV HEADER;
```

## 📝 사용 예시

### 태그와 연락 상태를 포함한 인플루언서 조회
```sql
SELECT
  i.*,
  ARRAY_AGG(DISTINCT t.tag) as tags,
  cs.status as contact_status
FROM influencers i
LEFT JOIN influencer_tags t ON i.id = t.influencer_id
LEFT JOIN contact_statuses cs ON i.id = cs.influencer_id
WHERE i.influencer_type = 'regular'
  AND i.follower_count > 100000
GROUP BY i.id, cs.status
ORDER BY i.engagement_rate DESC
LIMIT 20;
```

### 타입별 통계 조회
```sql
SELECT * FROM influencer_summary
WHERE influencer_type = 'all';
```

### 특정 태그를 가진 인플루언서 검색
```sql
SELECT i.*
FROM influencers i
INNER JOIN influencer_tags t ON i.id = t.influencer_id
WHERE t.tag = '뷰티'
ORDER BY i.follower_count DESC;
```

## 🔧 유지보수

### 인덱스 재구성
```sql
REINDEX TABLE influencers;
REINDEX TABLE influencer_tags;
```

### 통계 업데이트
```sql
ANALYZE influencers;
ANALYZE influencer_tags;
ANALYZE contact_statuses;
```

## 📱 React 앱 연동

모든 데이터베이스 작업은 `InfluencerService.js`를 통해 수행됩니다:

```javascript
import InfluencerService from './services/InfluencerService';

// 인플루언서 조회
const result = await InfluencerService.getInfluencers({
  page: 1,
  pageSize: 20,
  influencerType: 'regular',
  status: 'contacted'
});

// 태그 추가
await InfluencerService.addInfluencerTag(influencerId, '뷰티');

// 연락 상태 업데이트
await InfluencerService.setInfluencerContactStatus(
  influencerId,
  'contacted'
);
```

## ✅ 마이그레이션 완료

- JSON 파일 데이터 → Supabase 데이터베이스 ✓
- localStorage 태그 → influencer_tags 테이블 ✓
- localStorage 연락 상태 → contact_statuses 테이블 ✓
- React 앱 Supabase 연동 ✓
- 실시간 업데이트 지원 ✓