import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";

interface CalculationHistory {
  expression: string;
  result: string;
  timestamp: number;
}

export function Calculator() {
  const [display, setDisplay] = useState("0");
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [memory, setMemory] = useState(0);
  const [history, setHistory] = useState<CalculationHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [angleMode, setAngleMode] = useState<'deg' | 'rad'>('deg');

  const saveCalculation = useMutation(api.calculator.saveCalculation);
  const calculationHistory = useQuery(api.calculator.getHistory) || [];

  const inputNumber = (num: string) => {
    if (waitingForOperand) {
      setDisplay(num);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === "0" ? num : display + num);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay("0.");
      setWaitingForOperand(false);
    } else if (display.indexOf(".") === -1) {
      setDisplay(display + ".");
    }
  };

  const clear = () => {
    setDisplay("0");
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  const clearEntry = () => {
    setDisplay("0");
  };

  const performOperation = (nextOperation: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue || 0;
      const newValue = calculate(currentValue, inputValue, operation);

      setDisplay(String(newValue));
      setPreviousValue(newValue);
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  };

  const calculate = (firstValue: number, secondValue: number, operation: string): number => {
    switch (operation) {
      case "+":
        return firstValue + secondValue;
      case "-":
        return firstValue - secondValue;
      case "×":
        return firstValue * secondValue;
      case "÷":
        return secondValue !== 0 ? firstValue / secondValue : 0;
      case "^":
        return Math.pow(firstValue, secondValue);
      case "mod":
        return firstValue % secondValue;
      default:
        return secondValue;
    }
  };

  const performScientificOperation = (op: string) => {
    const value = parseFloat(display);
    let result: number;
    let expression = "";

    switch (op) {
      case "sin":
        result = Math.sin(angleMode === 'deg' ? (value * Math.PI) / 180 : value);
        expression = `sin(${value}${angleMode === 'deg' ? '°' : ' rad'})`;
        break;
      case "cos":
        result = Math.cos(angleMode === 'deg' ? (value * Math.PI) / 180 : value);
        expression = `cos(${value}${angleMode === 'deg' ? '°' : ' rad'})`;
        break;
      case "tan":
        result = Math.tan(angleMode === 'deg' ? (value * Math.PI) / 180 : value);
        expression = `tan(${value}${angleMode === 'deg' ? '°' : ' rad'})`;
        break;
      case "log":
        result = Math.log10(value);
        expression = `log(${value})`;
        break;
      case "ln":
        result = Math.log(value);
        expression = `ln(${value})`;
        break;
      case "sqrt":
        result = Math.sqrt(value);
        expression = `√(${value})`;
        break;
      case "x²":
        result = value * value;
        expression = `(${value})²`;
        break;
      case "x³":
        result = value * value * value;
        expression = `(${value})³`;
        break;
      case "1/x":
        result = 1 / value;
        expression = `1/(${value})`;
        break;
      case "!":
        result = factorial(Math.floor(value));
        expression = `${Math.floor(value)}!`;
        break;
      case "π":
        result = Math.PI;
        expression = "π";
        break;
      case "e":
        result = Math.E;
        expression = "e";
        break;
      default:
        return;
    }

    setDisplay(String(result));
    addToHistory(expression, String(result));
    setWaitingForOperand(true);
  };

  const factorial = (n: number): number => {
    if (n < 0) return 0;
    if (n === 0 || n === 1) return 1;
    return n * factorial(n - 1);
  };

  const addToHistory = async (expression: string, result: string) => {
    const newEntry = {
      expression,
      result,
      timestamp: Date.now()
    };
    setHistory(prev => [newEntry, ...prev.slice(0, 9)]);
    
    try {
      await saveCalculation({ expression, result });
    } catch (error) {
      console.error("Failed to save calculation:", error);
    }
  };

  const performEquals = () => {
    const inputValue = parseFloat(display);

    if (previousValue !== null && operation) {
      const newValue = calculate(previousValue, inputValue, operation);
      const expression = `${previousValue} ${operation} ${inputValue}`;
      
      setDisplay(String(newValue));
      addToHistory(expression, String(newValue));
      setPreviousValue(null);
      setOperation(null);
      setWaitingForOperand(true);
    }
  };

  const memoryStore = () => {
    setMemory(parseFloat(display));
    toast.success("Value stored in memory");
  };

  const memoryRecall = () => {
    setDisplay(String(memory));
    setWaitingForOperand(true);
  };

  const memoryClear = () => {
    setMemory(0);
    toast.success("Memory cleared");
  };

  const memoryAdd = () => {
    setMemory(memory + parseFloat(display));
    toast.success("Value added to memory");
  };

  const Button = ({ onClick, className = "", children, ...props }: any) => (
    <button
      onClick={onClick}
      className={`h-12 rounded-lg font-semibold transition-all duration-150 active:scale-95 ${className}`}
      {...props}
    >
      {children}
    </button>
  );

  return (
    <div className="flex gap-6">
      {/* Calculator */}
      <div className="bg-white rounded-xl shadow-lg p-6 flex-1 max-w-md">
        {/* Display */}
        <div className="mb-4">
          <div className="bg-gray-900 text-white p-4 rounded-lg text-right">
            <div className="text-sm text-gray-400 mb-1">
              {operation && previousValue !== null && `${previousValue} ${operation}`}
            </div>
            <div className="text-2xl font-mono">{display}</div>
          </div>
          <div className="flex justify-between items-center mt-2 text-sm text-gray-600">
            <span>Memory: {memory}</span>
            <button
              onClick={() => setAngleMode(angleMode === 'deg' ? 'rad' : 'deg')}
              className="px-2 py-1 bg-blue-100 text-blue-700 rounded"
            >
              {angleMode.toUpperCase()}
            </button>
          </div>
        </div>

        {/* Scientific Functions Row 1 */}
        <div className="grid grid-cols-5 gap-2 mb-2">
          <Button onClick={() => performScientificOperation("sin")} className="bg-blue-100 text-blue-700 hover:bg-blue-200">
            sin
          </Button>
          <Button onClick={() => performScientificOperation("cos")} className="bg-blue-100 text-blue-700 hover:bg-blue-200">
            cos
          </Button>
          <Button onClick={() => performScientificOperation("tan")} className="bg-blue-100 text-blue-700 hover:bg-blue-200">
            tan
          </Button>
          <Button onClick={() => performScientificOperation("log")} className="bg-blue-100 text-blue-700 hover:bg-blue-200">
            log
          </Button>
          <Button onClick={() => performScientificOperation("ln")} className="bg-blue-100 text-blue-700 hover:bg-blue-200">
            ln
          </Button>
        </div>

        {/* Scientific Functions Row 2 */}
        <div className="grid grid-cols-5 gap-2 mb-2">
          <Button onClick={() => performScientificOperation("x²")} className="bg-blue-100 text-blue-700 hover:bg-blue-200">
            x²
          </Button>
          <Button onClick={() => performScientificOperation("x³")} className="bg-blue-100 text-blue-700 hover:bg-blue-200">
            x³
          </Button>
          <Button onClick={() => performOperation("^")} className="bg-blue-100 text-blue-700 hover:bg-blue-200">
            x^y
          </Button>
          <Button onClick={() => performScientificOperation("sqrt")} className="bg-blue-100 text-blue-700 hover:bg-blue-200">
            √
          </Button>
          <Button onClick={() => performScientificOperation("1/x")} className="bg-blue-100 text-blue-700 hover:bg-blue-200">
            1/x
          </Button>
        </div>

        {/* Constants and Special */}
        <div className="grid grid-cols-5 gap-2 mb-2">
          <Button onClick={() => performScientificOperation("π")} className="bg-green-100 text-green-700 hover:bg-green-200">
            π
          </Button>
          <Button onClick={() => performScientificOperation("e")} className="bg-green-100 text-green-700 hover:bg-green-200">
            e
          </Button>
          <Button onClick={() => performScientificOperation("!")} className="bg-green-100 text-green-700 hover:bg-green-200">
            n!
          </Button>
          <Button onClick={() => performOperation("mod")} className="bg-green-100 text-green-700 hover:bg-green-200">
            mod
          </Button>
          <Button onClick={clear} className="bg-red-100 text-red-700 hover:bg-red-200">
            C
          </Button>
        </div>

        {/* Memory Functions */}
        <div className="grid grid-cols-4 gap-2 mb-2">
          <Button onClick={memoryClear} className="bg-purple-100 text-purple-700 hover:bg-purple-200">
            MC
          </Button>
          <Button onClick={memoryRecall} className="bg-purple-100 text-purple-700 hover:bg-purple-200">
            MR
          </Button>
          <Button onClick={memoryStore} className="bg-purple-100 text-purple-700 hover:bg-purple-200">
            MS
          </Button>
          <Button onClick={memoryAdd} className="bg-purple-100 text-purple-700 hover:bg-purple-200">
            M+
          </Button>
        </div>

        {/* Main Calculator Grid */}
        <div className="grid grid-cols-4 gap-2">
          <Button onClick={clearEntry} className="bg-gray-200 text-gray-700 hover:bg-gray-300">
            CE
          </Button>
          <Button onClick={() => setDisplay(display.slice(0, -1) || "0")} className="bg-gray-200 text-gray-700 hover:bg-gray-300">
            ⌫
          </Button>
          <Button onClick={() => setDisplay(String(-parseFloat(display)))} className="bg-gray-200 text-gray-700 hover:bg-gray-300">
            ±
          </Button>
          <Button onClick={() => performOperation("÷")} className="bg-orange-100 text-orange-700 hover:bg-orange-200">
            ÷
          </Button>

          <Button onClick={() => inputNumber("7")} className="bg-gray-100 hover:bg-gray-200">
            7
          </Button>
          <Button onClick={() => inputNumber("8")} className="bg-gray-100 hover:bg-gray-200">
            8
          </Button>
          <Button onClick={() => inputNumber("9")} className="bg-gray-100 hover:bg-gray-200">
            9
          </Button>
          <Button onClick={() => performOperation("×")} className="bg-orange-100 text-orange-700 hover:bg-orange-200">
            ×
          </Button>

          <Button onClick={() => inputNumber("4")} className="bg-gray-100 hover:bg-gray-200">
            4
          </Button>
          <Button onClick={() => inputNumber("5")} className="bg-gray-100 hover:bg-gray-200">
            5
          </Button>
          <Button onClick={() => inputNumber("6")} className="bg-gray-100 hover:bg-gray-200">
            6
          </Button>
          <Button onClick={() => performOperation("-")} className="bg-orange-100 text-orange-700 hover:bg-orange-200">
            -
          </Button>

          <Button onClick={() => inputNumber("1")} className="bg-gray-100 hover:bg-gray-200">
            1
          </Button>
          <Button onClick={() => inputNumber("2")} className="bg-gray-100 hover:bg-gray-200">
            2
          </Button>
          <Button onClick={() => inputNumber("3")} className="bg-gray-100 hover:bg-gray-200">
            3
          </Button>
          <Button onClick={() => performOperation("+")} className="bg-orange-100 text-orange-700 hover:bg-orange-200">
            +
          </Button>

          <Button onClick={() => inputNumber("0")} className="bg-gray-100 hover:bg-gray-200 col-span-2">
            0
          </Button>
          <Button onClick={inputDecimal} className="bg-gray-100 hover:bg-gray-200">
            .
          </Button>
          <Button onClick={performEquals} className="bg-blue-500 text-white hover:bg-blue-600">
            =
          </Button>
        </div>
      </div>

      {/* History Panel */}
      <div className="bg-white rounded-xl shadow-lg p-6 w-80">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">History</h3>
          <button
            onClick={() => setHistory([])}
            className="text-sm text-red-600 hover:text-red-800"
          >
            Clear
          </button>
        </div>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {calculationHistory.map((calc, index) => (
            <div key={index} className="p-2 bg-gray-50 rounded text-sm">
              <div className="text-gray-600">{calc.expression}</div>
              <div className="font-semibold">= {calc.result}</div>
              <div className="text-xs text-gray-400">
                {new Date(calc._creationTime).toLocaleTimeString()}
              </div>
            </div>
          ))}
          {calculationHistory.length === 0 && (
            <div className="text-gray-500 text-center py-8">
              No calculations yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
