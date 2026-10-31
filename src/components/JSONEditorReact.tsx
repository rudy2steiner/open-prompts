//
// JSONEditorReact.tsx
//
import { useEffect, useRef } from 'react'
import { JSONEditor, JSONEditorPropsOptional,Mode } from 'vanilla-jsoneditor'
import styled from 'styled-components';
const JSONEditorReact: React.FC<JSONEditorPropsOptional> = (props) => {
  const refContainer = useRef<HTMLDivElement>(null)
  const refEditor = useRef<JSONEditor | null>(null)

  useEffect(() => {
    // create editor
    refEditor.current = new JSONEditor({
      target: refContainer.current!,
      props: { 'mode': Mode.text ,'askToFormat':false }
    })

    return () => {
      // destroy editor
      if (refEditor.current) {
        refEditor.current.destroy()
        refEditor.current = null
      }
    }
  }, [])

  useEffect(() => {
    // update props
    if (refEditor.current) {
      refEditor.current.updateProps(props)
    }
  }, [props])
  return <Container ref={refContainer} className="w-[80%] h-full min-h-500 mx-auto mb-2 inline-block " />
}

const Container = styled.div`
  div.jse-main {
      min-height: 60vh;
  }
`;
export default JSONEditorReact