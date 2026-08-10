import type { z, ZodTypeAny } from "zod";

import { get, groupBy } from "lodash-es";

export function useValidation<T extends ZodTypeAny>(schema: T, data: MaybeRefOrGetter<Record<string, unknown>>, options?: { mode: "eager" | "lazy" | "partial" }) {
  const opts = Object.assign({}, { mode: "lazy" }, options);

  const isValid = ref(true);

  let unwatch: null | (() => void) = null;

  const errors = ref<Record<string, z.ZodIssue[]> | null>(null);

  const clearErrors = (field: string = "all") => {
    if (field === "all") {
      errors.value = null;
    }
    else {
      if (errors.value && errors.value[field])
        delete errors.value[field];
    }
  };

  const validationWatch = () => {
    if (unwatch !== null) {
      return;
    }

    unwatch = watch(
      () => toValue(data),
      async () => {
        // eslint-disable-next-line ts/no-use-before-define
        await validate();
      },
      { deep: true },
    );
  };

  const validate = async () => {
    clearErrors();

    const result = await schema.safeParseAsync(toValue(data));

    isValid.value = result.success;

    if (!result.success) {
      errors.value = groupBy(result.error.issues, "path");
      if (opts.mode === "lazy")
        validationWatch();
    }

    return errors;
  };

  const validatePartial = async (partialData: MaybeRefOrGetter<Record<string, unknown>>, refinements = null) => {
    let schemaPartial = schema.partial();

    if (refinements) {
      refinements.forEach((r) => {
        schemaPartial = schemaPartial.refine(...r);
      });
    }

    const result = await schemaPartial.safeParseAsync(toValue(partialData));

    isValid.value = result.success;

    if (!result.success) {
      errors.value = { ...errors.value, ...groupBy(result.error.issues, "path") };
    }
    else {
      Object.keys(partialData).forEach((p) => {
        if (errors.value && errors.value[p])
          delete errors.value[p];
      });
    }
  };

  const scrollToError = (selector = ".p-invalid", options = { offset: 0 }) => {
    const element = document.querySelector(selector);

    if (element) {
      const topOffset = element.getBoundingClientRect().top - document.body.getBoundingClientRect().top - options.offset;

      window.scrollTo({
        behavior: "smooth",
        top: topOffset,
      });
    }
  };

  const getError = (path: string) => get(errors.value, `${path.replaceAll(".", ",")}.0.message`);

  if (opts.mode === "eager") {
    validationWatch();
  }

  return { validate, validatePartial, errors, isValid, clearErrors, getError, scrollToError };
}
