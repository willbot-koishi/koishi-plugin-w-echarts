import { h, Context, z, Service } from 'koishi'
import {} from 'koishi-plugin-w-canvas'

import type skia from '@willbot-koishi/skia-canvas'
import * as echarts from 'echarts'

export const name = 'w-echarts'

declare module 'koishi' {
  interface Context {
    echarts: EChartService
  }
}

export type EChartHandler = {
  chart: echarts.ECharts
  canvas: skia.Canvas
  dispose: () => void
  export: (timeout?: number) => Promise<h>
}

type RemoveIndex<T> = {
  [K in keyof T as
    string extends K ? never :
    number extends K ? never :
    symbol extends K ? never :
    K
  ] : T[K]
}

export type StrictEChartsOption = RemoveIndex<echarts.EChartsOption>

class EChartService extends Service {
  static readonly inject = [ 'canvas' ]

  public createChart<Strict extends boolean = false>(
    width: number,
    height: number,
    options: Strict extends true ? StrictEChartsOption : echarts.EChartsOption
  ): EChartHandler {
    const canvas = new this.ctx.canvas.Canvas(width, height)
    const chart = echarts.init(canvas as unknown as HTMLElement)
    chart.setOption({
      textStyle: {
        fontFamily: this.config.font
      },
      ...options,
    })
    return {
      chart,
      canvas,
      dispose: () => chart.dispose(),
      export: async (timeout = 2000) => {
        await new Promise<void>(res => {
          chart.on('finished', () => res())
          setTimeout(() => res(), timeout)
        })
        const el = h.image(await canvas.toBuffer('png'), 'image/png')
        chart.dispose()
        return el
      }
    }
  }

  public constructor(ctx: Context, public config: EChartService.Config) {
    super(ctx, 'echarts')

    this.ctx.command('echarts', 'ECharts service')

    this.ctx.command('echarts.test', 'Test ECharts service. Returns a simple pie chart.')
      .action(async () => {
        const handler = this.createChart(400, 300, {
          title: { text: 'ECharts Test' },
          tooltip: {},
          series: {
            type: 'pie',
            data: [
              { value: 25, name: 'A' },
              { value: 25, name: 'B' },
              { value: 25, name: 'Cheeze' },
              { value: 25, name: 'D' },
            ]
          }
        })
        return handler.export()
      })
  }
}

namespace EChartService {
  export interface Config {
    font: string
  }
  export const Config: z<Config> = z.object({
    font: z.string().default('sans').description('ECharts 使用的字体')
  })
}

export default EChartService

export { echarts }
