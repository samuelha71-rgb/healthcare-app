// 페이지 단위 에러 바운더리 — 한 페이지에서 예외가 나도 사이트 전체가 깨지지 않음
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class PageErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // 콘솔로 디버깅 흔적 남김
    console.error('PageErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="max-w-md mx-auto mt-12 p-6 bg-white rounded-xl border border-red-100 shadow-sm anim-fade-in">
          <div className="text-3xl mb-2">⚠️</div>
          <h2 className="font-bold text-lg mb-2">화면을 그리는 중 문제가 생겼어요</h2>
          <p className="text-sm text-gray-600 mb-4">
            잠시 후 다시 시도하거나 새로고침해 주세요. 같은 문제가 반복되면
            다른 메뉴로 이동했다가 돌아오시면 대부분 해결됩니다.
          </p>
          <details className="text-xs text-gray-500 mb-4">
            <summary className="cursor-pointer hover:text-gray-700">
              오류 상세 보기
            </summary>
            <pre className="mt-2 p-2 bg-gray-50 rounded overflow-x-auto whitespace-pre-wrap">
              {this.state.error.message}
            </pre>
          </details>
          <div className="flex gap-2">
            <button
              onClick={() => this.setState({ error: null })}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              다시 시도
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              새로고침
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
