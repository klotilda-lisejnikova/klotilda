import { computed } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import type { EmailTemplate, EmailTemplateKey } from '@klotilda/domain';
import { services } from './api';

export const EMAIL_TEMPLATES_QUERY_KEY = ['email-templates'];
const LIST_LIMIT = 50;

/** Every e-mail template, by its key. */
export function useEmailTemplates() {
  const query = useQuery({
    queryKey: EMAIL_TEMPLATES_QUERY_KEY,
    queryFn: async (): Promise<EmailTemplate[]> =>
      (await services.emailTemplates.getAll({ limit: LIST_LIMIT })).data,
  });
  const byKey = computed(
    () =>
      new Map(query.data.value?.map((template) => [template.key, template])) as Map<
        EmailTemplateKey,
        EmailTemplate
      >
  );
  return { ...query, byKey };
}
