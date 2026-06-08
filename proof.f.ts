import { assert, assertEq } from 'functionalscript/fs/asserts/module.f.js'
import { utf8, utf8ToString } from 'functionalscript/fs/text/module.f.js'
import { vec8 } from 'functionalscript/fs/types/bit_vec/module.f.js'
import type { IncomingMessage } from 'functionalscript/fs/effects/node/module.f.js'
import { virtual, emptyState } from 'functionalscript/fs/effects/node/virtual/module.f.js'
import { listener } from './server.f.ts'

const request = (url: string): IncomingMessage => ({
    method: 'GET',
    url,
    headers: {},
    body: vec8(0n),
})

const runRequest = (url: string, root = emptyState.root) =>
    virtual({ ...emptyState, root })(listener(request(url)))

const bodyText = (url: string, root = emptyState.root) => {
    const [state, response] = runRequest(url, root)
    return [state, response, utf8ToString(response.body)] as const
}

const includes = (s: string) => (part: string) => {
    assert(s.includes(part), [part, s])
}

export const proof = {
    servesFiles: () => {
        const file = utf8('body { color: green; }\n')
        const [state, response] = runRequest('/main.css', { 'main.css': file })

        assertEq(response.status, 200)
        assertEq(utf8ToString(response.body), 'body { color: green; }\n')
        includes(state.stdout)('reading ./main.css\n')
        includes(state.stdout)('served: 23 bytes\n')
    },
    ignoresQueryString: () => {
        const file = utf8('ok')
        const [_, response] = runRequest('/main.css?cache=bust', { 'main.css': file })

        assertEq(response.status, 200)
        assertEq(utf8ToString(response.body), 'ok')
    },
    rendersDirectoryListing: () => {
        const [state, response, body] = bodyText('/docs', {
            docs: {
                'a.txt': utf8('A'),
                nested: {},
            },
        })

        assertEq(response.status, 200)
        includes(body)('<link rel="stylesheet" href="/main.css">')
        includes(body)('<pre><a href="/docs/a.txt">a.txt</a>\n<a href="/docs/nested">nested/</a>\n</pre>')
        includes(state.stdout)('reading ./docs\n')
        includes(state.stdout)('served: ')
    },
    missingPaths404: () => {
        const [state, response] = runRequest('/missing')

        assertEq(response.status, 404)
        assertEq(utf8ToString(response.body), '404 not found')
        assertEq(state.stdout, 'reading ./missing\nserved: 13 bytes\n')
    },
}
