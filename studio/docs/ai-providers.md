# AI 제공업체 연결

| 제공업체 | 초기 모델 ID (직접 변경 가능) | API |
| --- | --- | --- |
| OpenAI | `gpt-5.4-mini` | Responses `/v1/responses` |
| Anthropic Claude | `claude-sonnet-4-6` | Messages `/v1/messages` |
| Google Gemini | `gemini-2.5-flash` | Gemini Developer API `generateContent` |

각 업체에서 발급받은 API 키와 구조화 출력 지원 모델이 필요합니다. 모델의 실제 사용 가능 여부는 계정 권한과 제공업체 정책에 따라 달라집니다. 앱에서 모델 ID를 수정할 수 있습니다. 별도 클라우드 게이트웨이와 사용자 지정 API 주소는 지원하지 않습니다.

## 데이터 흐름과 키 관리

브라우저는 제공업체별 키·모델 설정을 React 메모리에 보관합니다. 새로고침하면 모두 초기화됩니다. 설계 요청에는 선택한 제공업체의 설정만 포함됩니다. 서버는 허용된 제공업체 ID를 검증하고 고정 HTTPS 주소로 요청하며 리디렉션을 거부합니다. Google 키도 URL이 아닌 헤더에 넣습니다. 앱은 키를 저장하거나 로그에 남기지 않으며, 원본 API 오류를 사용자에게 노출하지 않습니다. 설계도와 프롬프트는 선택한 제공업체에 전달되고 그 업체의 데이터 처리 정책이 적용됩니다.

## 구현과 확장

- `lib/ai-providers.ts`: 제공업체 ID, 표시명, 초기 모델과 메모리 설정 타입.
- `lib/ai-server.ts`: 업체별 인증 헤더·요청 형식·응답 텍스트 변환. OpenAI는 `text.format`, Claude는 `output_config.format`, Gemini는 `generationConfig.responseJsonSchema`를 사용합니다.
- `app/api/blueprint/route.ts`: 공통 입력 제한, 프롬프트, 설계도 검증, 최대 한 번의 수정 요청. 기존 클라이언트가 `provider`를 생략하면 OpenAI로 처리합니다.
- `app/page.tsx`: 업체 선택과 키·모델 입력, 변경 계획 미리보기와 사용자 적용.

Claude에 전송하는 스키마에서는 미지원 배열 길이 제약을 설명으로 변환합니다. 실제 좌표 배열 길이, 명령 150개, 작업 좌표 32,000개, 최종 블록 16,000개 제한은 기존 `applyPlan`이 계속 검증합니다. 거절·출력 잘림·빈 응답은 적용하지 않습니다. 잘못된 JSON이나 설계 명령은 같은 제공업체에서 한 번만 수정 요청합니다. 다른 업체로 자동 전환하지 않습니다.

업체를 추가할 때는 메타데이터와 서버 어댑터를 추가하고 `scripts/check-ai.mjs`에 해당 업체의 실제 요청·응답 형식에 맞는 모의 테스트를 확장하세요. 프롬프트와 편집·검증 기능을 복제할 필요는 없습니다.

## 검증 범위

`node scripts/check-ai.mjs`는 세 업체의 요청 주소·키 헤더·스키마·성공 응답·수정 재시도·인증 오류·사용량 제한·거절·출력 잘림·시간 초과를 모의 응답으로 확인합니다. 실제 유료 API 호출과 계정별 모델 사용 가능 여부는 별도로 확인해야 합니다.

## 공식 API 문서

- [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [Claude Structured Outputs와 스키마 제한](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- [Gemini GenerateContent API](https://ai.google.dev/api/generate-content)
- [Gemini 구조화 출력](https://ai.google.dev/gemini-api/docs/generate-content/structured-output)
