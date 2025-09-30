'use client';

import { useState } from 'react';
import wav from 'node-wav';

type WavData = {
  readonly sampleRate: number;
  readonly channelData: readonly Float32Array[];
};

const decodeWavFile = async (file: File): Promise<WavData> => {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return wav.decode(buffer);
}

// 非同期でチャンネルデータを結合する関数
const concatChannelDataAsync = async (channel1: Float32Array, channel2: Float32Array, sampleRate: number): Promise<Float32Array> => {
  return new Promise((resolve) => {
    // UIをブロックしないように次のフレームで実行
    requestAnimationFrame(() => {
      const result = Float32Array.from([
        ...channel1, 
        ...channel2, 
        ...channel2.slice(0, sampleRate)
      ]);
      resolve(result);
    });
  });
};

const concatWavs = async (wav1: WavData, wav2: WavData): Promise<WavData> => {
  if (wav1.sampleRate !== wav2.sampleRate) {
    throw new Error("Sample rates do not match.");
  }
  if (wav1.channelData.length !== wav2.channelData.length) {
    throw new Error("Number of channels do not match.");
  }

  // 各チャンネルを非同期で処理
  const concatenatedChannelData: Float32Array[] = [];
  
  for (let i = 0; i < wav1.channelData.length; i++) {
    const concatenatedChannel = await concatChannelDataAsync(
      wav1.channelData[i], 
      wav2.channelData[i], 
      wav2.sampleRate
    );
    concatenatedChannelData.push(concatenatedChannel);
    
    // 進行状況を示すために少し待機（UIの更新を可能にする）
    if (i < wav1.channelData.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
  
  return { sampleRate: wav1.sampleRate, channelData: concatenatedChannelData };
}

export default function Home() {
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [processedFileName, setProcessedFileName] = useState<string>("concatenated.wav");
  const [fileInfo, setFileInfo] = useState<{
    introLength: number;
    loopLength: number;
    sampleRate: number;
  } | null>(null);

  // Recieve two wav files and concatenate them
  const OnSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsProcessing(true);
    
    try {
      const formData = new FormData(event.currentTarget);
      const file1 = formData.get("file1") as File;
      const file2 = formData.get("file2") as File;
      const bitDepth = parseInt(formData.get("bitDepth") as string) || 32;

      if (!file1 || !file2) {
        setError("2つのWAVファイルをアップロードしてください。");
        return;
      }
      
      setProcessingStep("ファイルを読み込み中...");
      const decoded1 = await decodeWavFile(file1);
      const decoded2 = await decodeWavFile(file2);

      setProcessingStep("音声ファイルを結合中...");
      const concatenated = await concatWavs(decoded1, decoded2);
      
      // ファイル情報を保存
      setFileInfo({
        introLength: decoded1.channelData[0].length,
        loopLength: decoded2.channelData[0].length,
        sampleRate: decoded1.sampleRate
      });
      
      setProcessingStep("ファイルをエンコード中...");

      const encoded = wav.encode(concatenated.channelData, {
        sampleRate: concatenated.sampleRate,
        float: true,
        bitDepth: bitDepth,
      });
      
      const blob = new Blob([encoded as Buffer<ArrayBuffer>], { type: "audio/wav" });
      const url = URL.createObjectURL(blob);
      
      // 前のURLがあればクリーンアップ
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
      
      setDownloadUrl(url);
      setProcessedFileName(`${file1.name}_${file2.name}_concatenated.wav`);
    } catch (err) {
      console.error('エラーが発生しました:', err);
      if (err instanceof Error) {
        if (err.message.includes("Sample rates do not match")) {
          setError("エラー: 2つのファイルのサンプルレートが一致しません。同じサンプルレートのファイルを使用してください。");
        } else if (err.message.includes("Number of channels do not match")) {
          setError("エラー: 2つのファイルの音声形式が一致しません。両方ともステレオまたは両方ともモノラルのファイルを使用してください。");
        } else {
          setError(`エラーが発生しました: ${err.message}`);
        }
      } else {
        setError("予期しないエラーが発生しました。ファイルが正しいWAV形式であることを確認してください。");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const OnClear = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const form = document.getElementById("wavForm") as HTMLFormElement;
    if (form) {
      form.reset();
    }
    setError(null);
    setProcessingStep("");
    setFileInfo(null);
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }
  };

  const handleDownload = () => {
    if (downloadUrl) {
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = processedFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };
  return (
    <div className="min-h-screen bg-gray-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-indigo-400 mb-4">
            WAV Concatenator
          </h1>
          <p className="text-gray-300 text-lg mb-6">
            音声ファイルを簡単に結合できるツールです
          </p>
          
        </div>

        <div className="bg-gray-800 rounded-2xl shadow-xl border border-gray-700 p-8">
          <form id="wavForm" onSubmit={OnSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="file1" className="block text-sm font-semibold text-gray-300 cursor-default">
                1つ目のWAVファイル
              </label>
              <div className="relative">
                <input
                  type="file"
                  id="file1"
                  name="file1"
                  accept=".wav"
                  required
                  className="block w-full text-sm text-gray-300 file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-700 file:text-white hover:file:bg-indigo-600 file:cursor-pointer transition-colors duration-200 border-2 border-gray-600 bg-gray-700 hover:bg-gray-600 rounded-lg p-3 focus:border-indigo-400 focus:outline-none cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="file2" className="block text-sm font-semibold text-gray-300 cursor-default">
                2つ目のWAVファイル
              </label>
              <div className="relative">
                <input
                  type="file"
                  id="file2"
                  name="file2"
                  accept=".wav"
                  required
                  className="block w-full text-sm text-gray-300 file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-700 file:text-white hover:file:bg-indigo-600 file:cursor-pointer transition-colors duration-200 border-2 border-gray-600 bg-gray-700 hover:bg-gray-600 rounded-lg p-3 focus:border-indigo-400 focus:outline-none cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="bitDepth" className="block text-sm font-semibold text-gray-300 cursor-default">
                ビット深度
              </label>
              <select
                id="bitDepth"
                name="bitDepth"
                defaultValue={32}
                className="block w-full px-4 py-3 border-2 border-gray-600 rounded-lg focus:border-indigo-400 focus:outline-none transition-colors duration-200 bg-gray-700 text-gray-200 cursor-pointer"
              >
                <option value={8}>8 bit</option>
                <option value={16}>16 bit</option>
                <option value={24}>24 bit</option>
                <option value={32}>32 bit</option>
              </select>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isProcessing}
                className={`flex-1 font-semibold py-4 px-6 rounded-lg transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-4 shadow-lg cursor-pointer ${
                  isProcessing 
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                    : 'bg-indigo-600 text-gray-100 hover:bg-indigo-700 focus:ring-indigo-400'
                }`}
              >
                <span className="flex items-center justify-center">
                  {isProcessing ? (
                    <svg className="w-5 h-5 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  )}
                  {isProcessing ? (processingStep || '処理中...') : 'ファイルを結合する'}
                </span>
              </button>
              
              <button
                type="button"
                onClick={OnClear}
                disabled={isProcessing}
                className={`px-6 py-4 font-semibold rounded-lg transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-4 shadow-md cursor-pointer ${
                  isProcessing 
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                    : 'bg-gray-600 text-gray-200 hover:bg-gray-500 focus:ring-gray-500'
                }`}
              >
                <span className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  クリア
                </span>
              </button>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-900/50 border border-red-700 rounded-lg">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              </div>
            )}
            
            {downloadUrl && (
              <div className="mt-4 p-6 bg-green-900/50 border border-green-700 rounded-lg">
                <div className="flex items-start mb-4">
                  <svg className="w-5 h-5 text-green-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm text-green-300 font-semibold">ファイルの結合が完了しました！</p>
                    <p className="text-xs text-green-400 mt-1">{processedFileName}</p>
                  </div>
                </div>
                
                {/* ミニプレイヤー */}
                <div className="bg-gray-700 rounded-lg p-4 mb-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    <span className="text-sm text-gray-200 font-medium">プレビュー</span>
                  </div>
                  
                  <audio 
                    controls 
                    src={downloadUrl}
                    className="w-full"
                    style={{
                      filter: 'invert(1) hue-rotate(180deg)',
                      borderRadius: '6px'
                    }}
                  />
                  
                  <p className="text-xs text-gray-400 mt-2">
                    ※ 結合されたファイルを再生して確認できます
                  </p>
                </div>
                
                {/* ファイル情報表示 */}
                {fileInfo && (
                  <div className="bg-gray-700 rounded-lg p-4 mb-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <span className="text-sm text-gray-200 font-medium">ファイル情報</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-600 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-300 font-medium">イントロ長</span>
                          <div className="text-right">
                            <div className="text-sm text-white font-mono">{fileInfo.introLength.toLocaleString()}</div>
                            <div className="text-xs text-gray-400">サンプル数</div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {(fileInfo.introLength / fileInfo.sampleRate).toFixed(2)}秒
                        </div>
                      </div>
                      
                      <div className="bg-gray-600 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-300 font-medium">ループ長</span>
                          <div className="text-right">
                            <div className="text-sm text-white font-mono">{fileInfo.loopLength.toLocaleString()}</div>
                            <div className="text-xs text-gray-400">サンプル数</div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {(fileInfo.loopLength / fileInfo.sampleRate).toFixed(2)}秒
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-gray-600">
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>サンプルレート: {fileInfo.sampleRate.toLocaleString()} Hz</span>
                        <span>合計: {(fileInfo.introLength + fileInfo.loopLength + fileInfo.sampleRate).toLocaleString()} サンプル</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-3">
                  <button
                    onClick={handleDownload}
                    className="flex-1 bg-green-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-green-700 transition-colors duration-200 focus:outline-none focus:ring-4 focus:ring-green-400 cursor-pointer"
                  >
                    <span className="flex items-center justify-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      ダウンロード
                    </span>
                  </button>
                  
                  <button
                    onClick={() => {
                      if (downloadUrl) {
                        URL.revokeObjectURL(downloadUrl);
                        setDownloadUrl(null);
                      }
                      setFileInfo(null);
                    }}
                    className="px-4 py-3 bg-gray-600 text-gray-200 font-semibold rounded-lg hover:bg-gray-500 transition-colors duration-200 focus:outline-none focus:ring-4 focus:ring-gray-500 cursor-pointer"
                  >
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      閉じる
                    </span>
                  </button>
                </div>
              </div>
            )}
          </form>

          <div className="mt-8 p-4 bg-gray-700 rounded-lg border border-gray-600">
            <h3 className="text-sm font-semibold text-gray-200 mb-2">使用方法：</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• 2つのWAVファイルを選択してください</li>
              <li>• ビット深度を選択してください（推奨：32bit）</li>
              <li>• 「ファイルを結合する」ボタンをクリックして結合されたファイルをダウンロード</li>
              <li>• 1つ目のWAVファイルの最後に2つ目のWAVファイルが結合され、さらに1秒間2つ目のWAVファイルの冒頭が繰り返されます</li>
              <li>• 処理は全てクライアント側で行われ、ファイルはサーバーに送信されません</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
