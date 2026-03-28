/** ENSAM scraper — process.env typing for strict mode. */
declare namespace NodeJS {
  interface ProcessEnv {
    ENSAM_USERNAME?: string;
    ENSAM_PASSWORD?: string;
    ENSAM_DEBUG?: string;
    ENSAM_LOG_JSON?: string;
    /** Optional: number of weeks to fetch (default 2). */
    ENSAM_WEEKS?: string;
  }
}
