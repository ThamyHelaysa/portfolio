import styled from 'styled-components';

const MaxWidthWrapper = styled.div`
  max-width: 900px;
  margin-left: auto;
  margin-right: auto;
  @media print {
    max-width: none;
  }
`

export { MaxWidthWrapper }