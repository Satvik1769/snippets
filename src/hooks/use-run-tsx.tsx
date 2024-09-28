import { useMemo } from "react"
import * as React from "react"
import { useCompiledTsx } from "./use-compiled-tsx"
import { Circuit } from "@tscircuit/core"

export const useRunTsx = (
  code?: string,
  type?: "board" | "footprint" | "package" | "model",
) => {
  type ??= "board"
  const compiledCode = useCompiledTsx(code)

  return useMemo(() => {
    try {
      globalThis.React = React

      // eval(compiledCode)
      const functionBody = `var exports = {}; var module = { exports }; ${compiledCode}; return module;`
      const module = Function(functionBody).call(globalThis)

      try {
        const circuit = new Circuit()

        if (Object.keys(module.exports).length > 1) {
          throw new Error(
            `Too many exports, only export one thing. You exported: ${JSON.stringify(Object.keys(module.exports))}`,
          )
        }

        const primaryKey = Object.keys(module.exports)[0]

        const UserElm = (props: any) =>
          React.createElement(module.exports[primaryKey], props)

        if (type === "board") {
          circuit.add(<UserElm />)
        } else if (type === "package") {
          circuit.add(
            <board width="10mm" height="10mm">
              <UserElm name="U1" />
            </board>,
          )
        } else if (type === "footprint") {
          circuit.add(
            <board width="10mm" height="10mm">
              <chip name="U1" footprint={<UserElm />} />
            </board>,
          )
        } else if (type === "model") {
          circuit.add(
            <board width="10mm" height="10mm">
              <chip
                name="U1"
                cadModel={{
                  jscad: <UserElm />,
                }}
              />
            </board>,
          )
        }

        circuit.render()

        const circuitJson = circuit.getCircuitJson()

        return {
          compiledModule: module,
          message: "",
          circuitJson,
        }
      } catch (error: any) {
        console.error("Evaluation error:", error)
        return {
          compiledModule: module,
          message: `Error: ${error.message}`,
          circuitJson: null,
        }
      }
    } catch (error: any) {
      console.error("Evaluation error:", error)
      return {
        compiledModule: null,
        message: `Error: ${error.message}`,
        circuitJson: null,
      }
    }
  }, [compiledCode])
}