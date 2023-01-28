import * as React from 'react';
import styled from 'styled-components';

import { TitleH3 } from '../Paragraphs/PageTitle';


const Container = styled.div`
  max-width: 40vw;
  margin: 3rem 0 3rem auto;
  padding: 3rem 2.5rem;
  background-color: ${(props) => props.theme.colors.preCodeBg};
  
`

const Title = styled(TitleH3)`
  margin-left: -4rem;
  padding: 0 8px;
  background-color: ${(props) => props.theme.colors.emphaticPProject};
  color: ${(props) => props.theme.colors.emphaticPProjectColor};
`

const Translate = styled.p`
  margin-bottom: 0.5rem;
`

const Description = styled.p`
  color: ${(props) => props.theme.colors.preCodeColor};
  font-size: .75rem;
`

const Phrases = ({ dataPhrases, className }) => {

    const [phrase, setPhrase] = React.useState({});

    const clamp = (val, min = 0, max = 1) => {
      return Math.max(min, Math.min(max, val));
    };

    function initPhrase(){
      let newIndex = clamp(Math.ceil(Math.random() * (dataPhrases.length - 1)),0,(dataPhrases.length - 1));
      console.log(dataPhrases[newIndex].node)
      setPhrase(dataPhrases[newIndex].node);
    }


    React.useEffect(() => {
      initPhrase();
    }, [phrase])

    return (
        <Container className={className}>
            <Title className='--title'>{phrase.phrase}</Title>
            <Translate className='--translate'>{phrase.translate}</Translate>
            <Description className='--desc'>{phrase.description}</Description>
        </Container>
    )
}

export default Phrases;
