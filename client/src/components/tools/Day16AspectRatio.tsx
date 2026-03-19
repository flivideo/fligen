import { useCalculator } from './aspect-ratio/useCalculator';
import Calculator from './aspect-ratio/Calculator';
import PresetButtons from './aspect-ratio/PresetButtons';
import VisualPreview from './aspect-ratio/VisualPreview';
import PlatformRecommendations from './aspect-ratio/PlatformRecommendations';
import CalculationHistory from './aspect-ratio/CalculationHistory';

export default function Day16AspectRatio() {
  const calc = useCalculator();

  return (
    <div className="bg-slate-900 text-white min-h-screen p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Aspect Ratio Calculator</h1>
        <p className="text-slate-400 text-sm mt-1">Bidirectional calculator with platform presets and visual comparison</p>
      </div>

      <PresetButtons
        activePreset={calc.activePreset}
        onPreset={calc.applyPreset}
        onResolution={calc.applyResolution}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Calculator
          width={calc.width}
          height={calc.height}
          ratioW={calc.ratioW}
          ratioH={calc.ratioH}
          computedRatio={calc.computedRatio}
          onWidthChange={calc.setWidth}
          onHeightChange={calc.setHeight}
          onRatioWChange={calc.setRatioW}
          onRatioHChange={calc.setRatioH}
          onCalculate={calc.calculate}
          onSwap={calc.swapDimensions}
        />
        <VisualPreview width={calc.width} height={calc.height} />
      </div>

      <PlatformRecommendations onSelect={calc.applyResolution} />

      <CalculationHistory
        history={calc.history}
        onRestore={calc.restoreFromHistory}
        onClear={calc.clearHistory}
      />
    </div>
  );
}
