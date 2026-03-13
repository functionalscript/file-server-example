import { utf8 } from 'functionalscript/text/module.f.js'
import { length, type Vec } from 'functionalscript/types/bit_vec/module.f.js'
import { pure } from 'functionalscript/types/effects/module.f.js'
import {
    createServer,
    listen,
    forever,
    type NodeProgram,
    type IncomingMessage,
    readFile,
    log,
    readdir,
    type IoResult,
    type Dirent,
} from 'functionalscript/types/effects/node/module.f.js'
import { htmlToString } from 'functionalscript/html/module.f.js'
import { concat } from 'functionalscript/path/module.f.js'

const listener = ({ url }: IncomingMessage) => {
    const path = url.split('?')[0] ?? ''
    const file = '.' + path

    const dirLink = ({ name, isFile }: Dirent) => {
        const href = '/' + concat(path)(name)
        return [['a', { href }, name + (isFile ? '' : '/')], '\n'] as const
    }

    const dirPage = (v: readonly Dirent[]) => htmlToString(
        ['html',
            ['head',
                ['link', { rel: 'stylesheet', href: '/main.css' }]
            ],
            ['body',
                ['pre',
                    ...v.flatMap(dirLink)
                ]
            ]
        ])

    const orReadDir = (r: IoResult<Vec>) => r[0] === 'ok'
        ? pure(r)
        : readdir(file, {})
            .step(([s, v]) => pure([s, utf8(s === 'ok' ? dirPage(v) : '')] as const))

    return log(`reading ${file}`)
        .step(() => readFile(file))
        .step(orReadDir)
        .step(([s, v]) => {
            const o = s === 'ok'
            return pure({
                status: o ? 200 : 404,
                headers: {},
                body: o ? v : utf8('404 not found'),
            })
        })
        .step(x =>
            log(`served: ${length(x.body) >> 3n} bytes`)
            .step(() => pure(x))
        )
}

const main: NodeProgram = () => createServer(listener)
    .step(server => listen(server, 3000))
    .step(forever)

export default main
