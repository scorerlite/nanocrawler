import React from "react";
import { addLocaleData } from "react-intl";
import _ from "lodash";
import Cookies from "js-cookie";
import moment from "moment";
import ConfigContext from "./ConfigContext";
import config from "../client-config.json";

import { translationMapping } from "../translations";
import en from "../translations/en.json"; // English

export default class ConfigProvider extends React.Component {
  state = {
    ticker: {
      price_usd: 0,
      price_btc: 0,
      percent_change_1h: 0,
      percent_change_24h: 0
    }
  };

  constructor(props) {
    super(props);

    this.state = {
      config: null,
      language: "en",
      messages: en
    };

    const language =
      Cookies.get("nanocrawler.locale") ||
      (navigator.languages && navigator.languages[0]) ||
      navigator.language ||
      navigator.userLanguage;

    this.setLanguage(language);
  }

  async componentDidMount() {
    const ticker = await this.fetchTicker();
    this.setState({ ticker }, () =>
      setTimeout(this.updateTicker.bind(this), 300000)
    );
  }

  async updateTicker() {
    const ticker = await this.fetchTicker();
    this.setState({ ticker });

    setTimeout(this.updateTicker.bind(this), 300000);
  }

  async fetchTicker() {
    const resp = await fetch("https://api.coinmarketcap.com/v1/ticker/nano/", {
      mode: "cors"
    });

    return (await resp.json())[0];
  }

  async setLanguage(language) {
    const langConfig = translationMapping[language] || {
      messages: language,
      intlLocale: language,
      momentLocale: language
    };

    const messages = await import(`../translations/${
      langConfig.messages
    }.json`);

    const locale = await import(`react-intl/locale-data/${
      langConfig.intlLocale
    }`);

    if (!/^en/.test(langConfig.momentLocale)) {
      await import(`moment/locale/${langConfig.momentLocale}`);
    }

    addLocaleData([...locale]);
    moment.locale(langConfig.momentLocale);

    this.setState({ language, messages }, () => {
      Cookies.set("nanocrawler.locale", language);
    });
  }

  render() {
    let { ticker, messages, language } = this.state;

    const mergedConfig = _.merge({}, config, {
      ticker,
      locale: {
        messages,
        language,
        setLanguage: this.setLanguage.bind(this)
      }
    });

    return (
      <ConfigContext.Provider value={mergedConfig}>
        {this.props.children}
      </ConfigContext.Provider>
    );
  }
}
