import * as React from 'react';
import { ThemeProvider } from 'styled-components'

import COLORS from "../../constants/colors"
import Layout from '../../components/Layout/Layout'
import Paragraph from '../../components/Paragraphs/paragraph';
import GlobalStyle from '../../components/GlobalPageStyles'



const Curriculum = () => {
    return (
        <ThemeProvider theme={{ colors:COLORS }}>
            <GlobalStyle></GlobalStyle>
            <Layout pageTitle="Thamires Helaysa" pageSub={"Front-end dev"}>
              <Paragraph>
                Hi!! I'm Thamires Helaysa dos Santos, but you can call me Thamy. I’m 24 years old and front-end developer since
                2018. I first started in web development in high school with computing classes and after that my passion was FrontEnd so I continued on using HTML, CSS e Javascript on a daily basis.
                My first real contact – that kept me growing – was at Bizcommerce maintaining templates and themes on Magento,
                and ever since I work with Magento 2. In all these years I improved my skills and learned how to: develop responsive
                layouts using the latest CSS properties, better utilization of HTML5 tags, more readable and maintainable CSS with
                methodologies as BEM and RSCSS, use of custom elements and javascript framework like Vue.js, and much more.
                Today my focus is on React and Node (still studying), but I really love Magento 2 - themes are fun to make.
              </Paragraph>
            </Layout>
        </ThemeProvider>
    )
}

export const Head = () => <title>About Me</title>

export default Curriculum
